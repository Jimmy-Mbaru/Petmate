"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_report_dto_1 = require("./dto/create-report.dto");
const client_1 = require("@prisma/client");
const ExcelJS = __importStar(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
function dtoStatusToPrisma(s) {
    const map = {
        [create_report_dto_1.ReportStatus.PENDING]: client_1.ReportStatus.PENDING,
        [create_report_dto_1.ReportStatus.UNDER_REVIEW]: client_1.ReportStatus.UNDER_REVIEW,
        [create_report_dto_1.ReportStatus.RESOLVED]: client_1.ReportStatus.RESOLVED,
        [create_report_dto_1.ReportStatus.DISMISSED]: client_1.ReportStatus.DISMISSED,
        [create_report_dto_1.ReportStatus.ACTION_TAKEN]: client_1.ReportStatus.ACTION_TAKEN,
    };
    return map[s];
}
let ReportsService = ReportsService_1 = class ReportsService {
    prisma;
    logger = new common_1.Logger(ReportsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReport(reporterId, dto) {
        try {
            const existingReport = await this.prisma.userReport.findFirst({
                where: {
                    reporterId,
                    reportedUserId: dto.reportedUserId,
                    reason: dto.reason,
                },
            });
            if (existingReport) {
                throw new common_1.BadRequestException('You have already reported this user for this reason');
            }
            const reportedUser = await this.prisma.user.findUnique({
                where: { id: dto.reportedUserId },
            });
            if (!reportedUser) {
                throw new common_1.NotFoundException('Reported user not found');
            }
            const report = await this.prisma.userReport.create({
                data: {
                    reporterId,
                    reportedUserId: dto.reportedUserId,
                    reason: dto.reason,
                    description: dto.description,
                    status: client_1.ReportStatus.PENDING,
                },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reportedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return {
                id: report.id,
                reporterId: report.reporterId,
                reporterName: report.reporter.name,
                reporterEmail: report.reporter.email,
                reportedUserId: report.reportedUserId,
                reportedUserName: report.reportedUser.name,
                reportedUserEmail: report.reportedUser.email,
                reason: report.reason,
                description: report.description,
                status: report.status,
                createdAt: report.createdAt,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Create report failed', error);
            throw error;
        }
    }
    async findAllReports(status, reason, limit = 20, offset = 0) {
        try {
            const where = {};
            const prismaStatus = status === undefined
                ? undefined
                : typeof status === 'string'
                    ? dtoStatusToPrisma(status)
                    : status;
            if (prismaStatus) {
                where.status = prismaStatus;
            }
            if (reason) {
                where.reason = reason;
            }
            const [reports, total] = await Promise.all([
                this.prisma.userReport.findMany({
                    where,
                    include: {
                        reporter: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        reportedUser: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                this.prisma.userReport.count({ where }),
            ]);
            return {
                data: reports.map((r) => ({
                    id: r.id,
                    reporterId: r.reporterId,
                    reporterName: r.reporter.name,
                    reporterEmail: r.reporter.email,
                    reportedUserId: r.reportedUserId,
                    reportedUserName: r.reportedUser.name,
                    reportedUserEmail: r.reportedUser.email,
                    reason: r.reason,
                    description: r.description,
                    status: r.status,
                    createdAt: r.createdAt,
                    reviewedAt: r.reviewedAt,
                    adminNotes: r.adminNotes,
                })),
                total,
                limit,
                offset,
            };
        }
        catch (error) {
            this.logger.error('Find all reports failed', error);
            throw error;
        }
    }
    async findOne(id) {
        try {
            const report = await this.prisma.userReport.findUnique({
                where: { id },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reportedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            if (!report) {
                throw new common_1.NotFoundException('Report not found');
            }
            return {
                id: report.id,
                reporterId: report.reporterId,
                reporterName: report.reporter.name,
                reporterEmail: report.reporter.email,
                reportedUserId: report.reportedUserId,
                reportedUserName: report.reportedUser.name,
                reportedUserEmail: report.reportedUser.email,
                reason: report.reason,
                description: report.description,
                status: report.status,
                createdAt: report.createdAt,
                reviewedAt: report.reviewedAt,
                adminNotes: report.adminNotes,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Find one report failed', error);
            throw error;
        }
    }
    async findByUser(userId) {
        try {
            const reports = await this.prisma.userReport.findMany({
                where: {
                    OR: [{ reporterId: userId }, { reportedUserId: userId }],
                },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reportedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return reports.map((r) => ({
                id: r.id,
                reporterId: r.reporterId,
                reporterName: r.reporter.name,
                reporterEmail: r.reporter.email,
                reportedUserId: r.reportedUserId,
                reportedUserName: r.reportedUser.name,
                reportedUserEmail: r.reportedUser.email,
                reason: r.reason,
                description: r.description,
                status: r.status,
                createdAt: r.createdAt,
            }));
        }
        catch (error) {
            this.logger.error('Find by user failed', error);
            throw error;
        }
    }
    async update(id, dto, adminId, adminRole) {
        try {
            if (adminRole !== client_1.Role.ADMIN) {
                throw new common_1.ForbiddenException('Only admins can update reports');
            }
            const report = await this.prisma.userReport.findUnique({
                where: { id },
            });
            if (!report) {
                throw new common_1.NotFoundException('Report not found');
            }
            const prismaStatus = dto.status
                ? dtoStatusToPrisma(dto.status)
                : undefined;
            const updated = await this.prisma.userReport.update({
                where: { id },
                data: {
                    ...(prismaStatus && { status: prismaStatus }),
                    ...(dto.adminNotes !== undefined && { adminNotes: dto.adminNotes }),
                    ...(prismaStatus && { reviewedAt: new Date() }),
                    ...(prismaStatus && { reviewedByAdminId: adminId }),
                },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reportedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return {
                id: updated.id,
                reporterId: updated.reporterId,
                reporterName: updated.reporter.name,
                reporterEmail: updated.reporter.email,
                reportedUserId: updated.reportedUserId,
                reportedUserName: updated.reportedUser.name,
                reportedUserEmail: updated.reportedUser.email,
                reason: updated.reason,
                description: updated.description,
                status: updated.status,
                createdAt: updated.createdAt,
                reviewedAt: updated.reviewedAt,
                adminNotes: updated.adminNotes,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('Update report failed', error);
            throw error;
        }
    }
    async getStats() {
        try {
            const [total, pending, underReview, resolved, dismissed, actionTaken] = await Promise.all([
                this.prisma.userReport.count(),
                this.prisma.userReport.count({
                    where: { status: client_1.ReportStatus.PENDING },
                }),
                this.prisma.userReport.count({
                    where: { status: client_1.ReportStatus.UNDER_REVIEW },
                }),
                this.prisma.userReport.count({
                    where: { status: client_1.ReportStatus.RESOLVED },
                }),
                this.prisma.userReport.count({
                    where: { status: client_1.ReportStatus.DISMISSED },
                }),
                this.prisma.userReport.count({
                    where: { status: client_1.ReportStatus.ACTION_TAKEN },
                }),
            ]);
            return {
                total,
                pending,
                underReview,
                resolved,
                dismissed,
                actionTaken,
            };
        }
        catch (error) {
            this.logger.error('Get stats failed', error);
            throw error;
        }
    }
    async remove(id, adminRole) {
        try {
            if (adminRole !== client_1.Role.ADMIN) {
                throw new common_1.ForbiddenException('Only admins can delete reports');
            }
            const report = await this.prisma.userReport.findUnique({
                where: { id },
            });
            if (!report) {
                throw new common_1.NotFoundException('Report not found');
            }
            await this.prisma.userReport.delete({ where: { id } });
            return { message: 'Report deleted successfully' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('Remove report failed', error);
            throw error;
        }
    }
    async exportReportsToExcel(res) {
        try {
            const reports = await this.prisma.userReport.findMany({
                include: {
                    reporter: { select: { name: true, email: true } },
                    reportedUser: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('User Reports');
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 36 },
                { header: 'Reporter Name', key: 'reporterName', width: 25 },
                { header: 'Reporter Email', key: 'reporterEmail', width: 30 },
                { header: 'Reported User Name', key: 'reportedUserName', width: 25 },
                { header: 'Reported User Email', key: 'reportedUserEmail', width: 30 },
                { header: 'Reason', key: 'reason', width: 20 },
                { header: 'Description', key: 'description', width: 40 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Created At', key: 'createdAt', width: 20 },
            ];
            reports.forEach((report) => {
                worksheet.addRow({
                    id: report.id,
                    reporterName: report.reporter.name,
                    reporterEmail: report.reporter.email,
                    reportedUserName: report.reportedUser.name,
                    reportedUserEmail: report.reportedUser.email,
                    reason: report.reason,
                    description: report.description,
                    status: report.status,
                    createdAt: report.createdAt.toISOString(),
                });
            });
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' },
            };
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=user-reports.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        }
        catch (error) {
            this.logger.error('Export Excel failed', error);
            throw error;
        }
    }
    async exportReportsToPdf(res) {
        try {
            const reports = await this.prisma.userReport.findMany({
                include: {
                    reporter: { select: { name: true, email: true } },
                    reportedUser: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=user-reports.pdf');
            doc.pipe(res);
            doc.fontSize(20).text('User Reports Export', { align: 'center' });
            doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, {
                align: 'center',
            });
            doc.moveDown(2);
            reports.forEach((report, index) => {
                if (index > 0 && index % 3 === 0) {
                    doc.addPage();
                }
                doc
                    .fontSize(12)
                    .fillColor('#333333')
                    .text(`Report ID: ${report.id}`, { underline: true });
                doc.fontSize(10).fillColor('#000000');
                doc.text(`Reporter: ${report.reporter.name} (${report.reporter.email})`);
                doc.text(`Reported User: ${report.reportedUser.name} (${report.reportedUser.email})`);
                doc.text(`Reason: ${report.reason}`);
                doc.text(`Status: ${report.status}`);
                doc.text(`Date: ${report.createdAt.toLocaleString()}`);
                doc.moveDown(0.5);
                doc.font('Helvetica-Bold').text('Description:');
                doc.text(report.description);
                doc.moveDown(1.5);
                doc
                    .moveTo(30, doc.y)
                    .lineTo(565, doc.y)
                    .strokeColor('#CCCCCC')
                    .stroke();
                doc.moveDown(1.5);
            });
            doc.end();
        }
        catch (error) {
            this.logger.error('Export PDF failed', error);
            throw error;
        }
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map