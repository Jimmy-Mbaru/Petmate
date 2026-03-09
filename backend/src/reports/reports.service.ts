import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, ReportReason, ReportStatus as ReportStatusDto } from './dto/create-report.dto';
import { Role, ReportStatus } from '@prisma/client';

function dtoStatusToPrisma(s: ReportStatusDto): ReportStatus {
  const map: Record<ReportStatusDto, ReportStatus> = {
    [ReportStatusDto.PENDING]: ReportStatus.PENDING,
    [ReportStatusDto.UNDER_REVIEW]: ReportStatus.UNDER_REVIEW,
    [ReportStatusDto.RESOLVED]: ReportStatus.RESOLVED,
    [ReportStatusDto.DISMISSED]: ReportStatus.DISMISSED,
    [ReportStatusDto.ACTION_TAKEN]: ReportStatus.ACTION_TAKEN,
  };
  return map[s];
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user report
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    try {
      // Check if reporter already reported this user
      const existingReport = await this.prisma.userReport.findFirst({
        where: {
          reporterId,
          reportedUserId: dto.reportedUserId,
          reason: dto.reason,
        },
      });

      if (existingReport) {
        throw new BadRequestException('You have already reported this user for this reason');
      }

      // Verify reported user exists
      const reportedUser = await this.prisma.user.findUnique({
        where: { id: dto.reportedUserId },
      });

      if (!reportedUser) {
        throw new NotFoundException('Reported user not found');
      }

      // Create the report
      const report = await this.prisma.userReport.create({
        data: {
          reporterId,
          reportedUserId: dto.reportedUserId,
          reason: dto.reason,
          description: dto.description,
          status: ReportStatus.PENDING,
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
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      this.logger.error('Create report failed', error);
      throw error;
    }
  }

  /**
   * Get all reports (Admin only)
   */
  async findAllReports(
    status?: ReportStatusDto | ReportStatus,
    reason?: ReportReason,
    limit: number = 20,
    offset: number = 0,
  ) {
    try {
      const where: any = {};
      const prismaStatus =
        status === undefined
          ? undefined
          : typeof status === 'string'
            ? dtoStatusToPrisma(status as ReportStatusDto)
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
    } catch (error) {
      this.logger.error('Find all reports failed', error);
      throw error;
    }
  }

  /**
   * Get report by ID (Admin only)
   */
  async findOne(id: string) {
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
        throw new NotFoundException('Report not found');
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
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Find one report failed', error);
      throw error;
    }
  }

  /**
   * Get reports for a specific user (Admin only)
   */
  async findByUser(userId: string) {
    try {
      const reports = await this.prisma.userReport.findMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedUserId: userId },
          ],
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
    } catch (error) {
      this.logger.error('Find by user failed', error);
      throw error;
    }
  }

  /**
   * Update report (Admin only)
   */
  async update(id: string, dto: UpdateReportDto, adminId: string, adminRole: Role) {
    try {
      if (adminRole !== Role.ADMIN) {
        throw new ForbiddenException('Only admins can update reports');
      }

      const report = await this.prisma.userReport.findUnique({
        where: { id },
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      const prismaStatus = dto.status ? dtoStatusToPrisma(dto.status) : undefined;
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
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error('Update report failed', error);
      throw error;
    }
  }

  /**
   * Get report statistics (Admin only)
   */
  async getStats() {
    try {
      const [total, pending, underReview, resolved, dismissed, actionTaken] = await Promise.all([
        this.prisma.userReport.count(),
        this.prisma.userReport.count({ where: { status: ReportStatus.PENDING } }),
        this.prisma.userReport.count({ where: { status: ReportStatus.UNDER_REVIEW } }),
        this.prisma.userReport.count({ where: { status: ReportStatus.RESOLVED } }),
        this.prisma.userReport.count({ where: { status: ReportStatus.DISMISSED } }),
        this.prisma.userReport.count({ where: { status: ReportStatus.ACTION_TAKEN } }),
      ]);

      return {
        total,
        pending,
        underReview,
        resolved,
        dismissed,
        actionTaken,
      };
    } catch (error) {
      this.logger.error('Get stats failed', error);
      throw error;
    }
  }

  /**
   * Delete report (Admin only)
   */
  async remove(id: string, adminRole: Role) {
    try {
      if (adminRole !== Role.ADMIN) {
        throw new ForbiddenException('Only admins can delete reports');
      }

      const report = await this.prisma.userReport.findUnique({
        where: { id },
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      await this.prisma.userReport.delete({
        where: { id },
      });

      return { message: 'Report deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error('Remove report failed', error);
      throw error;
    }
  }
}
