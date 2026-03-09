import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { JwtPayload } from '../auth/auth.service';

interface AuthenticatedSocket {
  id: string;
  userId?: string;
}

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(
    client: AuthenticatedSocket & { handshake?: { auth?: { token?: string } } },
  ): Promise<void> {
    try {
      const token = client.handshake?.auth?.token;
      if (!token) {
        this.logger.warn('Socket connection without token');
        return;
      }
      const payload = this.jwtService.verify<JwtPayload>(token);
      (client as AuthenticatedSocket).userId = payload.sub;
      const userId = payload.sub;
      const wasOffline = !this.userSockets.has(userId);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      await this.chatService.updateLastSeen(userId);
      if (wasOffline) {
        this.server.emit('presence', {
          userId,
          online: true,
          lastSeenAt: null,
        });
      }
    } catch {
      this.logger.warn('Invalid socket token');
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.userId;
    if (!userId) return;
    const hadSockets = this.userSockets.has(userId);
    if (hadSockets) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
        await this.chatService.updateLastSeen(userId);
        const lastSeenAt = new Date();
        this.server.emit('presence', {
          userId,
          online: false,
          lastSeenAt: lastSeenAt.toISOString(),
        });
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    payload: { receiverId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const senderId = client.userId;
      if (!senderId) return { error: 'Unauthorized' };
      const message = await this.chatService.saveMessage(
        senderId,
        payload.receiverId,
        payload.content,
      );
      const receiverSockets = this.userSockets.get(payload.receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((sid) => {
          this.server.to(sid).emit('new_message', message);
        });
      }
      return message;
    } catch (error) {
      this.logger.error('send_message failed', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('messages_read')
  async handleMessagesRead(
    @MessageBody() payload: { senderId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;
      if (!userId) return { error: 'Unauthorized' };
      await this.chatService.markAsRead(userId, payload.senderId);
      const senderSockets = this.userSockets.get(payload.senderId);
      if (senderSockets) {
        senderSockets.forEach((sid) => {
          this.server.to(sid).emit('messages_read', { readerId: userId });
        });
      }
      return { success: true };
    } catch (error) {
      this.logger.error('messages_read failed', error);
      return { error: 'Failed to mark read' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() payload: { receiverId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const userId = client.userId;
    if (!userId || !payload?.receiverId) return;
    const receiverSockets = this.userSockets.get(payload.receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((sid) => {
        this.server.to(sid).emit('user_typing', { userId });
      });
    }
  }

  @SubscribeMessage('get_presence')
  async handleGetPresence(
    @MessageBody() payload: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return { error: 'Unauthorized' };
      const targetId = payload.userId;
      if (!targetId) return { error: 'userId required' };
      const online = this.userSockets.has(targetId);
      const lastSeenAt = await this.chatService.getLastSeen(targetId);
      return {
        userId: targetId,
        online,
        lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      };
    } catch (error) {
      this.logger.error('get_presence failed', error);
      return { error: 'Failed to get presence' };
    }
  }
}
