import { BlockReportService } from './block-report.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ReportUserDto } from './dto/report-user.dto';
export declare class BlockReportController {
    private readonly blockReportService;
    private readonly logger;
    constructor(blockReportService: BlockReportService);
    block(userId: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    unblock(userId: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    listBlocked(user: CurrentUserPayload): Promise<{
        userId: string;
        name: string;
    }[]>;
    report(userId: string, dto: ReportUserDto, user: CurrentUserPayload): Promise<{
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
}
