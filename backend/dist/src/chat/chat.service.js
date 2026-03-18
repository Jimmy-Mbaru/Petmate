"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const block_report_service_1 = require("../block-report/block-report.service");
let ChatService = ChatService_1 = class ChatService {
    prisma;
    blockReport;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(prisma, blockReport) {
        this.prisma = prisma;
        this.blockReport = blockReport;
    }
    async getHistory(userId, otherUserId) {
        try {
            const blocked = await this.blockReport.isBlocked(userId, otherUserId);
            if (blocked)
                return [];
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
        }
        catch (error) {
            this.logger.error('Get chat history failed', error);
            throw error;
        }
    }
    async getConversations(userId) {
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
            const conversations = new Map();
            for (const msg of messages) {
                const isSender = msg.senderId === userId;
                const otherUser = isSender ? msg.receiver : msg.sender;
                const otherUserId = otherUser.id;
                if (blockedIds.has(otherUserId))
                    continue;
                if (!conversations.has(otherUserId)) {
                    const displayName = otherUser.name && !otherUser.name.includes('@')
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
            for (const row of unreadBySender) {
                if (blockedIds.has(row.senderId))
                    continue;
                const existing = conversations.get(row.senderId);
                if (existing) {
                    existing.unreadCount = row._count._all;
                }
                else {
                    const otherUser = await this.prisma.user.findUnique({
                        where: { id: row.senderId },
                        select: { id: true, name: true, email: true },
                    });
                    if (otherUser) {
                        const displayName = otherUser.name && !otherUser.name.includes('@')
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
            return Array.from(conversations.values()).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
        }
        catch (error) {
            this.logger.error('Get conversations failed', error);
            throw error;
        }
    }
    async getUnreadCount(userId) {
        try {
            const count = await this.prisma.message.count({
                where: { receiverId: userId, read: false },
            });
            return { unreadCount: count };
        }
        catch (error) {
            this.logger.error('Get unread count failed', error);
            throw error;
        }
    }
    async saveMessage(senderId, receiverId, content) {
        try {
            const receiver = await this.prisma.user.findUnique({
                where: { id: receiverId },
            });
            if (!receiver)
                throw new common_1.NotFoundException('Receiver not found');
            const receiverBlockedSender = await this.blockReport.isBlocked(receiverId, senderId);
            const senderBlockedReceiver = await this.blockReport.isBlocked(senderId, receiverId);
            if (receiverBlockedSender || senderBlockedReceiver)
                throw new common_1.ForbiddenException('Cannot send message to this user');
            return this.prisma.message.create({
                data: { senderId, receiverId, content },
                include: {
                    sender: { select: { id: true, name: true } },
                    receiver: { select: { id: true, name: true } },
                },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Save message failed', error);
            throw error;
        }
    }
    async markAsRead(userId, senderId) {
        try {
            await this.prisma.message.updateMany({
                where: { receiverId: userId, senderId, read: false },
                data: { read: true },
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error('Mark as read failed', error);
            throw error;
        }
    }
    async updateLastSeen(userId) {
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { lastSeenAt: new Date() },
            });
        }
        catch (error) {
            this.logger.error('Update last seen failed', error);
        }
    }
    async getLastSeen(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { lastSeenAt: true },
            });
            return user?.lastSeenAt ?? null;
        }
        catch (error) {
            this.logger.error('Get last seen failed', error);
            return null;
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        block_report_service_1.BlockReportService])
], ChatService);
//# sourceMappingURL=chat.service.js.map