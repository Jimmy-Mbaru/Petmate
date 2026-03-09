import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary:
      'List conversations with last message and unread count per conversation',
  })
  @ApiResponse({
    status: 200,
    description:
      'Array of conversations with userId, userName, lastMessage, lastMessageAt, lastMessageFromSelf, unreadCount',
  })
  @ApiResponsesProtected()
  async getConversations(@CurrentUser() user: CurrentUserPayload) {
    try {
      this.logger.debug(`Get conversations requested by user ${user.id}`);
      return await this.chatService.getConversations(user.id);
    } catch (error) {
      this.logger.error(
        `Get conversations failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread messages count' })
  @ApiResponse({
    status: 200,
    description: 'Object with unreadCount number',
  })
  @ApiResponsesProtected()
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    try {
      this.logger.debug(`Get unread count requested by user ${user.id}`);
      return await this.chatService.getUnreadCount(user.id);
    } catch (error) {
      this.logger.error(
        `Get unread count failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get message history with a user' })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'Other user ID (UUID) to get conversation with',
  })
  @ApiResponse({ status: 200, description: 'List of messages (chronological)' })
  @ApiResponsesProtected()
  async getHistory(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.debug(
        `Get chat history requested: user ${user.id} with ${userId}`,
      );
      return await this.chatService.getHistory(user.id, userId);
    } catch (error) {
      this.logger.error(
        `Get chat history failed for user ${user.id} with ${userId}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('message')
  @ApiOperation({ summary: 'Send a message to a user (HTTP fallback)' })
  @ApiBody({
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
  })
  @ApiResponse({
    status: 201,
    description: 'Created message',
  })
  @ApiResponsesProtected()
  async sendMessage(
    @Body() body: { receiverId: string; content: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.debug(
        `Send message requested by user ${user.id} to ${body.receiverId}`,
      );
      return await this.chatService.saveMessage(
        user.id,
        body.receiverId,
        body.content,
      );
    } catch (error) {
      this.logger.error(
        `Send message failed for user ${user.id} to ${body.receiverId}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark messages with a user as read' })
  @ApiBody({
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
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
  })
  @ApiResponsesProtected()
  async markAsReadHttp(
    @Body() body: { otherUserId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.debug(
        `Mark messages as read requested by user ${user.id} for ${body.otherUserId}`,
      );
      return await this.chatService.markAsRead(user.id, body.otherUserId);
    } catch (error) {
      this.logger.error(
        `Mark messages as read failed for user ${user.id} with ${body.otherUserId}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
