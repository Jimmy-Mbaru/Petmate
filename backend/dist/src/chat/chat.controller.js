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
var ChatController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let ChatController = ChatController_1 = class ChatController {
    chatService;
    logger = new common_1.Logger(ChatController_1.name);
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getConversations(user) {
        try {
            this.logger.debug(`Get conversations requested by user ${user.id}`);
            return await this.chatService.getConversations(user.id);
        }
        catch (error) {
            this.logger.error(`Get conversations failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async getUnreadCount(user) {
        try {
            this.logger.debug(`Get unread count requested by user ${user.id}`);
            return await this.chatService.getUnreadCount(user.id);
        }
        catch (error) {
            this.logger.error(`Get unread count failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async getHistory(userId, user) {
        try {
            this.logger.debug(`Get chat history requested: user ${user.id} with ${userId}`);
            return await this.chatService.getHistory(user.id, userId);
        }
        catch (error) {
            this.logger.error(`Get chat history failed for user ${user.id} with ${userId}`, error?.stack);
            throw error;
        }
    }
    async sendMessage(body, user) {
        try {
            this.logger.debug(`Send message requested by user ${user.id} to ${body.receiverId}`);
            return await this.chatService.saveMessage(user.id, body.receiverId, body.content);
        }
        catch (error) {
            this.logger.error(`Send message failed for user ${user.id} to ${body.receiverId}`, error?.stack);
            throw error;
        }
    }
    async markAsReadHttp(body, user) {
        try {
            this.logger.debug(`Mark messages as read requested by user ${user.id} for ${body.otherUserId}`);
            return await this.chatService.markAsRead(user.id, body.otherUserId);
        }
        catch (error) {
            this.logger.error(`Mark messages as read failed for user ${user.id} with ${body.otherUserId}`, error?.stack);
            throw error;
        }
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({
        summary: 'List conversations with last message and unread count per conversation',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of conversations with userId, userName, lastMessage, lastMessageAt, lastMessageFromSelf, unreadCount',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total unread messages count' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Object with unreadCount number',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)(':userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get message history with a user' }),
    (0, swagger_1.ApiParam)({
        name: 'userId',
        type: String,
        description: 'Other user ID (UUID) to get conversation with',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of messages (chronological)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('message'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to a user (HTTP fallback)' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                receiverId: {
                    type: 'string',
                    description: 'Receiver user ID (UUID)',
                },
                content: {
                    type: 'string',
                    description: 'Message content',
                },
            },
            required: ['receiverId', 'content'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Created message',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark messages with a user as read' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                otherUserId: {
                    type: 'string',
                    description: 'Other user ID (UUID) whose messages are marked as read',
                },
            },
            required: ['otherUserId'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Messages marked as read',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsReadHttp", null);
exports.ChatController = ChatController = ChatController_1 = __decorate([
    (0, swagger_1.ApiTags)('chat'),
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map