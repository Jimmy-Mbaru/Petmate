import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, ReportReason, ReportStatus as ReportStatusDto } from './dto/create-report.dto';
import { Role, ReportStatus } from '@prisma/client';
import { Response } from 'express';
export declare class ReportsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createReport(reporterId: string, dto: CreateReportDto): Promise<{
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
    findAllReports(status?: ReportStatusDto | ReportStatus, reason?: ReportReason, limit?: number, offset?: number): Promise<{
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
    update(id: string, dto: UpdateReportDto, adminId: string, adminRole: Role): Promise<{
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
    getStats(): Promise<{
        total: number;
        pending: number;
        underReview: number;
        resolved: number;
        dismissed: number;
        actionTaken: number;
    }>;
    remove(id: string, adminRole: Role): Promise<{
        message: string;
    }>;
    exportReportsToExcel(res: Response): Promise<void>;
    exportReportsToPdf(res: Response): Promise<void>;
}
