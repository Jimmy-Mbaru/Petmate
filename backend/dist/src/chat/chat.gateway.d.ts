import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
interface AuthenticatedSocket {
    id: string;
    userId?: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly jwtService;
    server: Server;
    private readonly logger;
    private userSockets;
    constructor(chatService: ChatService, jwtService: JwtService);
    handleConnection(client: AuthenticatedSocket & {
        handshake?: {
            auth?: {
                token?: string;
            };
        };
    }): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): Promise<void>;
    handleSendMessage(payload: {
        receiverId: string;
        content: string;
    }, client: AuthenticatedSocket): Promise<({
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
    }) | {
        error: string;
    }>;
    handleMessagesRead(payload: {
        senderId: string;
    }, client: AuthenticatedSocket): Promise<{
        error: string;
        success?: undefined;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    handleTyping(payload: {
        receiverId: string;
    }, client: AuthenticatedSocket): void;
    handleGetPresence(payload: {
        userId: string;
    }, client: AuthenticatedSocket): Promise<{
        error: string;
        userId?: undefined;
        online?: undefined;
        lastSeenAt?: undefined;
    } | {
        userId: string;
        online: boolean;
        lastSeenAt: string | null;
        error?: undefined;
    }>;
}
export {};
