import { ChatService } from './chat.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
export declare class ChatController {
    private readonly chatService;
    private readonly logger;
    constructor(chatService: ChatService);
    getConversations(user: CurrentUserPayload): Promise<{
        userId: string;
        userName: string;
        lastMessage: string;
        lastMessageAt: Date;
        lastMessageFromSelf: boolean;
        unreadCount: number;
    }[]>;
    getUnreadCount(user: CurrentUserPayload): Promise<{
        unreadCount: number;
    }>;
    getHistory(userId: string, user: CurrentUserPayload): Promise<({
        sender: {
            id: string;
            name: string;
        };
        receiver: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        content: string;
        read: boolean;
        sentAt: Date;
        senderId: string;
        receiverId: string;
    })[]>;
    sendMessage(body: {
        receiverId: string;
        content: string;
    }, user: CurrentUserPayload): Promise<{
        sender: {
            id: string;
            name: string;
        };
        receiver: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        content: string;
        read: boolean;
        sentAt: Date;
        senderId: string;
        receiverId: string;
    }>;
    markAsReadHttp(body: {
        otherUserId: string;
    }, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
}
