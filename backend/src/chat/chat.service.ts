import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';

/**
 * Chat service: message history, conversations list, unread count, send and mark read.
 * Messages and conversations involving blocked users are hidden.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReport: BlockReportService,
  ) {}

  /**
   * Get message history between two users (chronological).
   * @param userId - The current user ID
   * @param otherUserId - The other participant's user ID
   * @returns List of messages with sender and receiver info
   */
  async getHistory(userId: string, otherUserId: string) {
    try {
      const blocked = await this.blockReport.isBlocked(userId, otherUserId);
      if (blocked) return [];
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
        orderBy: { sentAt: 'asc' },
      });
      return messages;
    } catch (error) {
      this.logger.error('Get chat history failed', error);
      throw error;
    }
  }

  /**
   * Get conversation summaries for a user (one per other user, with last message and unread count).
   * @param userId - The current user ID
   * @returns List of conversation summaries sorted by last message date
   */
  async getConversations(userId: string) {
    try {
      const blockedIds = await this.blockReport.getBlockedUserIds(userId);
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        },
        orderBy: { sentAt: 'desc' },
      });

      type ConversationSummary = {
        userId: string;
        userName: string;
        lastMessage: string;
        lastMessageAt: Date;
        lastMessageFromSelf: boolean;
        unreadCount: number;
      };

      const conversations = new Map<string, ConversationSummary>();

      for (const msg of messages) {
        const isSender = msg.senderId === userId;
        const otherUser = isSender ? msg.receiver : msg.sender;
        const otherUserId = otherUser.id;
        if (blockedIds.has(otherUserId)) continue;
        if (!conversations.has(otherUserId)) {
          const displayName =
            otherUser.name && !otherUser.name.includes('@')
              ? otherUser.name
              : otherUser.email.split('@')[0];
          conversations.set(otherUserId, {
            userId: otherUserId,
            userName: displayName,
            lastMessage: msg.content,
            lastMessageAt: msg.sentAt,
            lastMessageFromSelf: isSender,
            unreadCount: 0,
          });
        }
      }

      const unreadBySender = await this.prisma.message.groupBy({
        by: ['senderId'],
        _count: { _all: true },
        where: {
          receiverId: userId,
          read: false,
        },
      });

      for (const row of unreadBySender as Array<{
        senderId: string;
        _count: { _all: number };
      }>) {
        if (blockedIds.has(row.senderId)) continue;
        const existing = conversations.get(row.senderId);
        if (existing) {
          existing.unreadCount = row._count._all;
        } else {
          // New conversation with only unread messages (no sent messages yet)
          const otherUser = await this.prisma.user.findUnique({
            where: { id: row.senderId },
            select: { id: true, name: true, email: true },
          });
          if (otherUser) {
            const displayName =
              otherUser.name && !otherUser.name.includes('@')
                ? otherUser.name
                : otherUser.email.split('@')[0];
            conversations.set(otherUser.id, {
              userId: otherUser.id,
              userName: displayName,
              lastMessage: '',
              lastMessageAt: new Date(0),
              lastMessageFromSelf: false,
              unreadCount: row._count._all,
            });
          }
        }
      }

      return Array.from(conversations.values()).sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      );
    } catch (error) {
      this.logger.error('Get conversations failed', error);
      throw error;
    }
  }

  /**
   * Get total unread message count for a user.
   * @param userId - The current user ID
   * @returns Object with unreadCount
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.message.count({
        where: { receiverId: userId, read: false },
      });
      return { unreadCount: count };
    } catch (error) {
      this.logger.error('Get unread count failed', error);
      throw error;
    }
  }

  /**
   * Save a new message from sender to receiver.
   * @param senderId - The sender user ID
   * @param receiverId - The receiver user ID
   * @param content - Message content
   * @returns The created message with sender and receiver info
   * @throws NotFoundException if receiver not found
   */
  async saveMessage(senderId: string, receiverId: string, content: string) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
      });
      if (!receiver) throw new NotFoundException('Receiver not found');
      const receiverBlockedSender = await this.blockReport.isBlocked(
        receiverId,
        senderId,
      );
      const senderBlockedReceiver = await this.blockReport.isBlocked(
        senderId,
        receiverId,
      );
      if (receiverBlockedSender || senderBlockedReceiver)
        throw new ForbiddenException('Cannot send message to this user');
      return this.prisma.message.create({
        data: { senderId, receiverId, content },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Save message failed', error);
      throw error;
    }
  }

  /**
   * Mark messages from a sender to the current user as read.
   * @param userId - The current user (receiver) ID
   * @param senderId - The sender user ID
   * @returns Object with success true
   */
  async markAsRead(userId: string, senderId: string) {
    try {
      await this.prisma.message.updateMany({
        where: { receiverId: userId, senderId, read: false },
        data: { read: true },
      });
      return { success: true };
    } catch (error) {
      this.logger.error('Mark as read failed', error);
      throw error;
    }
  }

  /**
   * Update a user's last seen timestamp (e.g. on socket connect/disconnect).
   */
  async updateLastSeen(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch (error) {
      this.logger.error('Update last seen failed', error);
    }
  }

  /**
   * Get a user's last seen timestamp for presence display.
   */
  async getLastSeen(userId: string): Promise<Date | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastSeenAt: true },
      });
      return user?.lastSeenAt ?? null;
    } catch (error) {
      this.logger.error('Get last seen failed', error);
      return null;
    }
  }
}
