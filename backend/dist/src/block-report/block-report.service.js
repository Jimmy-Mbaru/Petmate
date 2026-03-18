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
var BlockReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockReportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
let BlockReportService = BlockReportService_1 = class BlockReportService {
    prisma;
    logger = new common_1.Logger(BlockReportService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async isBlocked(blockerId, blockedUserId) {
        if (blockerId === blockedUserId)
            return false;
        const row = await this.prisma.userBlock.findUnique({
            where: {
                blockerId_blockedId: { blockerId, blockedId: blockedUserId },
            },
        });
        return !!row;
    }
    async getBlockedUserIds(userId) {
        const rows = await this.prisma.userBlock.findMany({
            where: { blockerId: userId },
            select: { blockedId: true },
        });
        return new Set(rows.map((r) => r.blockedId));
    }
    async block(blockerId, blockedId) {
        if (blockerId === blockedId)
            throw new common_1.BadRequestException('Cannot block yourself');
        const target = await this.prisma.user.findUnique({
            where: { id: blockedId },
        });
        if (!target)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.userBlock.upsert({
            where: {
                blockerId_blockedId: { blockerId, blockedId },
            },
            create: { blockerId, blockedId },
            update: {},
        });
        return { success: true };
    }
    async unblock(blockerId, blockedId) {
        await this.prisma.userBlock.deleteMany({
            where: { blockerId, blockedId },
        });
        return { success: true };
    }
    async listBlocked(blockerId) {
        const rows = await this.prisma.userBlock.findMany({
            where: { blockerId },
            include: {
                blocked: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({ userId: r.blockedId, name: r.blocked.name }));
    }
    async report(reporterId, reportedUserId, reason) {
        if (reporterId === reportedUserId)
            throw new common_1.BadRequestException('Cannot report yourself');
        const reported = await this.prisma.user.findUnique({
            where: { id: reportedUserId },
        });
        if (!reported)
            throw new common_1.NotFoundException('User not found');
        const created = await this.prisma.userReport.create({
            data: {
                reporterId,
                reportedUserId,
                reason: reason ?? '',
                description: reason ?? '',
                status: client_1.ReportStatus.PENDING,
            },
            include: {
                reportedUser: { select: { id: true, name: true, email: true } },
            },
        });
        this.logger.log(`User ${reportedUserId} reported by ${reporterId}, reason length=${reason?.length ?? 0}`);
        return created;
    }
    async listReports(limit, offset, status) {
        const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
        const where = status ? { status } : {};
        const [data, total] = await Promise.all([
            this.prisma.userReport.findMany({
                where,
                include: {
                    reporter: { select: { id: true, name: true, email: true } },
                    reportedUser: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.userReport.count({ where }),
        ]);
        return { data, total, limit: take, offset: skip };
    }
    async resolveReport(reportId, status, adminNotes) {
        const report = await this.prisma.userReport.findUnique({
            where: { id: reportId },
        });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (report.status !== client_1.ReportStatus.PENDING)
            throw new common_1.BadRequestException('Report already resolved or dismissed');
        const prismaStatus = status === 'REVIEWED' ? client_1.ReportStatus.RESOLVED : client_1.ReportStatus.DISMISSED;
        return this.prisma.userReport.update({
            where: { id: reportId },
            data: {
                status: prismaStatus,
                adminNotes: adminNotes ?? undefined,
                reviewedAt: new Date(),
            },
            include: {
                reportedUser: { select: { id: true, name: true } },
            },
        });
    }
};
exports.BlockReportService = BlockReportService;
exports.BlockReportService = BlockReportService = BlockReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlockReportService);
//# sourceMappingURL=block-report.service.js.map