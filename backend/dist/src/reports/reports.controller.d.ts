import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto, ReportReason, ReportStatus } from './dto/create-report.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Response } from 'express';
export declare class ReportsController {
    private readonly reportsService;
    private readonly logger;
    constructor(reportsService: ReportsService);
    createReport(user: CurrentUserPayload, dto: CreateReportDto): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        reporterEmail: string;
        reportedUserId: string;
        reportedUserName: string;
        reportedUserEmail: string;
        reason: string;
        description: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        createdAt: Date;
    }>;
    findAll(status?: ReportStatus, reason?: ReportReason, limit?: number, offset?: number): Promise<{
        data: {
            id: string;
            reporterId: string;
            reporterName: string;
            reporterEmail: string;
            reportedUserId: string;
            reportedUserName: string;
            reportedUserEmail: string;
            reason: string;
            description: string;
            status: import(".prisma/client").$Enums.ReportStatus;
            createdAt: Date;
            reviewedAt: Date | null;
            adminNotes: string | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    exportExcel(res: Response): Promise<void>;
    exportPdf(res: Response): Promise<void>;
    getStats(): Promise<{
        total: number;
        pending: number;
        underReview: number;
        resolved: number;
        dismissed: number;
        actionTaken: number;
    }>;
    findByUser(userId: string): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        reporterEmail: string;
        reportedUserId: string;
        reportedUserName: string;
        reportedUserEmail: string;
        reason: string;
        description: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        reporterEmail: string;
        reportedUserId: string;
        reportedUserName: string;
        reportedUserEmail: string;
        reason: string;
        description: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        createdAt: Date;
        reviewedAt: Date | null;
        adminNotes: string | null;
    }>;
    update(id: string, dto: UpdateReportDto, user: CurrentUserPayload): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        reporterEmail: string;
        reportedUserId: string;
        reportedUserName: string;
        reportedUserEmail: string;
        reason: string;
        description: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        createdAt: Date;
        reviewedAt: Date | null;
        adminNotes: string | null;
    }>;
    remove(id: string, user: CurrentUserPayload): Promise<{
        message: string;
    }>;
}
