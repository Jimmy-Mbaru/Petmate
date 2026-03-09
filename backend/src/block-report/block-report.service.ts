import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

/**
 * Block/Report service: block user (hide messages & bookings), report user (admin queue).
 */
@Injectable()
export class BlockReportService {
  private readonly logger = new Logger(BlockReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Whether blocker has blocked blockedUserId (used to hide content).
   */
  async isBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    if (blockerId === blockedUserId) return false;
    const row = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId: blockedUserId },
      },
    });
    return !!row;
  }

  /**
   * Get set of user IDs that the given user has blocked (for filtering lists).
   */
  async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return new Set(rows.map((r) => r.blockedId));
  }

  /**
   * Block a user. Idempotent.
   */
  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId)
      throw new BadRequestException('Cannot block yourself');
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!target) throw new NotFoundException('User not found');
    await this.prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });
    return { success: true };
  }

  /**
   * Unblock a user.
   */
  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return { success: true };
  }

  /**
   * List users blocked by the current user (ids and names).
   */
  async listBlocked(blockerId: string) {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ userId: r.blockedId, name: r.blocked.name }));
  }

  /**
   * Report a user (creates PENDING report for admin queue).
   */
  async report(
    reporterId: string,
    reportedUserId: string,
    reason?: string,
  ) {
    if (reporterId === reportedUserId)
      throw new BadRequestException('Cannot report yourself');
    const reported = await this.prisma.user.findUnique({
      where: { id: reportedUserId },
    });
    if (!reported) throw new NotFoundException('User not found');
    const created = await this.prisma.userReport.create({
      data: {
        reporterId,
        reportedUserId,
        reason: reason ?? '',
        description: reason ?? '',
        status: ReportStatus.PENDING,
      },
      include: {
        reportedUser: { select: { id: true, name: true, email: true } },
      },
    });
    this.logger.log(
      `User ${reportedUserId} reported by ${reporterId}, reason length=${reason?.length ?? 0}`,
    );
    return created;
  }

  /**
   * Admin: list reports (paginated), optional filter by status.
   */
  async listReports(
    limit?: number,
    offset?: number,
    status?: ReportStatus,
  ): Promise<PaginatedResponse<unknown>> {
    const { take, skip } = getPaginationParams(limit, offset);
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

  /**
   * Admin: resolve or dismiss a report (set status + optional adminNotes).
   */
  async resolveReport(
    reportId: string,
    status: 'REVIEWED' | 'DISMISSED',
    adminNotes?: string,
  ) {
    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING)
      throw new BadRequestException('Report already resolved or dismissed');
    const prismaStatus =
      status === 'REVIEWED' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;
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
}
