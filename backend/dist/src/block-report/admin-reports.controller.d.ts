import { BlockReportService } from './block-report.service';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
export declare class AdminReportsController {
    private readonly blockReportService;
    private readonly logger;
    constructor(blockReportService: BlockReportService);
    listReports(query: ListReportsQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    resolveReport(id: string, dto: ResolveReportDto): Promise<{
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
