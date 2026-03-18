import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';
export declare class ChatService {
    private readonly prisma;
    private readonly blockReport;
    private readonly logger;
    constructor(prisma: PrismaService, blockReport: BlockReportService);
    getHistory(userId: string, otherUserId: string): Promise<({
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
    getConversations(userId: string): Promise<{
        userId: string;
        userName: string;
        lastMessage: string;
        lastMessageAt: Date;
        lastMessageFromSelf: boolean;
        unreadCount: number;
    }[]>;
    getUnreadCount(userId: string): Promise<{
        unreadCount: number;
    }>;
    saveMessage(senderId: string, receiverId: string, content: string): Promise<{
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
    markAsRead(userId: string, senderId: string): Promise<{
        success: boolean;
    }>;
    updateLastSeen(userId: string): Promise<void>;
    getLastSeen(userId: string): Promise<Date | null>;
}
