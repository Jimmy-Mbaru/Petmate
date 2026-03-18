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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    chatService;
    jwtService;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    userSockets = new Map();
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake?.auth?.token;
            if (!token) {
                this.logger.warn('Socket connection without token');
                return;
            }
            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;
            const userId = payload.sub;
            const wasOffline = !this.userSockets.has(userId);
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(client.id);
            await this.chatService.updateLastSeen(userId);
            if (wasOffline) {
                this.server.emit('presence', {
                    userId,
                    online: true,
                    lastSeenAt: null,
                });
            }
        }
        catch {
            this.logger.warn('Invalid socket token');
        }
    }
    async handleDisconnect(client) {
        const userId = client.userId;
        if (!userId)
            return;
        const hadSockets = this.userSockets.has(userId);
        if (hadSockets) {
            this.userSockets.get(userId).delete(client.id);
            if (this.userSockets.get(userId).size === 0) {
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
    async handleSendMessage(payload, client) {
        try {
            const senderId = client.userId;
            if (!senderId)
                return { error: 'Unauthorized' };
            const message = await this.chatService.saveMessage(senderId, payload.receiverId, payload.content);
            const receiverSockets = this.userSockets.get(payload.receiverId);
            if (receiverSockets) {
                receiverSockets.forEach((sid) => {
                    this.server.to(sid).emit('new_message', message);
                });
            }
            return message;
        }
        catch (error) {
            this.logger.error('send_message failed', error);
            return { error: 'Failed to send message' };
        }
    }
    async handleMessagesRead(payload, client) {
        try {
            const userId = client.userId;
            if (!userId)
                return { error: 'Unauthorized' };
            await this.chatService.markAsRead(userId, payload.senderId);
            const senderSockets = this.userSockets.get(payload.senderId);
            if (senderSockets) {
                senderSockets.forEach((sid) => {
                    this.server.to(sid).emit('messages_read', { readerId: userId });
                });
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error('messages_read failed', error);
            return { error: 'Failed to mark read' };
        }
    }
    handleTyping(payload, client) {
        const userId = client.userId;
        if (!userId || !payload?.receiverId)
            return;
        const receiverSockets = this.userSockets.get(payload.receiverId);
        if (receiverSockets) {
            receiverSockets.forEach((sid) => {
                this.server.to(sid).emit('user_typing', { userId });
            });
        }
    }
    async handleGetPresence(payload, client) {
        try {
            if (!client.userId)
                return { error: 'Unauthorized' };
            const targetId = payload.userId;
            if (!targetId)
                return { error: 'userId required' };
            const online = this.userSockets.has(targetId);
            const lastSeenAt = await this.chatService.getLastSeen(targetId);
            return {
                userId: targetId,
                online,
                lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
            };
        }
        catch (error) {
            this.logger.error('get_presence failed', error);
            return { error: 'Failed to get presence' };
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('messages_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessagesRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_presence'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleGetPresence", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map