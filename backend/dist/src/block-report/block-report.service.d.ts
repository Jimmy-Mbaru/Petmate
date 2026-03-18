import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
export declare class BlockReportService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    isBlocked(blockerId: string, blockedUserId: string): Promise<boolean>;
    getBlockedUserIds(userId: string): Promise<Set<string>>;
    block(blockerId: string, blockedId: string): Promise<{
        success: boolean;
    }>;
    unblock(blockerId: string, blockedId: string): Promise<{
        success: boolean;
    }>;
    listBlocked(blockerId: string): Promise<{
        userId: string;
        name: string;
    }[]>;
    report(reporterId: string, reportedUserId: string, reason?: string): Promise<{
        reportedUser: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        description: string;
        id: string;
        createdAt: Date;
        reason: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        adminNotes: string | null;
        reviewedAt: Date | null;
        reviewedByAdminId: string | null;
        reporterId: string;
        reportedUserId: string;
    }>;
    listReports(limit?: number, offset?: number, status?: ReportStatus): Promise<PaginatedResponse<unknown>>;
    resolveReport(reportId: string, status: 'REVIEWED' | 'DISMISSED', adminNotes?: string): Promise<{
        reportedUser: {
            id: string;
            name: string;
        };
    } & {
        description: string;
        id: string;
        createdAt: Date;
        reason: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        adminNotes: string | null;
        reviewedAt: Date | null;
        reviewedByAdminId: string | null;
        reporterId: string;
        reportedUserId: string;
    }>;
}
