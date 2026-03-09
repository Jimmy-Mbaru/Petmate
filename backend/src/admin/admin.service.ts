import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, Role, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

/**
 * Booking counts grouped by month and status (for dashboard analytics).
 */
export interface BookingsByStatusPerMonthItem {
  month: string; // YYYY-MM-DD (first day of month)
  status: string;
  count: number;
}

/**
 * Revenue totals grouped by month (for dashboard analytics).
 */
export interface RevenueByMonthItem {
  month: string;
  revenue: number;
}

/**
 * Product with total quantity sold (for dashboard top products).
 */
export interface TopProductItem {
  productId: string;
  name: string;
  totalQuantity: number;
}

/**
 * Host with booking count (for dashboard top hosts).
 */
export interface TopHostItem {
  hostId: string;
  hostName: string;
  bookingCount: number;
}

/**
 * Admin service: user management, boarding approval, orders, and dashboard analytics.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly client: PrismaClient;

  constructor(private readonly prisma: PrismaService) {
    this.client = prisma as unknown as PrismaClient;
  }

  /**
   * Get all users
   * @param limit - The limit of the users
   * @param offset - The offset of the users
   * @param role - The role of the users
   * @param email - The email of the users
   * @returns The paginated response of the users
   */
  async getUsers(
    limit?: number,
    offset?: number,
    role?: string,
    email?: string,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const { take, skip } = getPaginationParams(limit, offset);
      const where: Prisma.UserWhereInput = {};
      if (role) where.role = role as Role;
      if (email) where.email = { contains: email, mode: 'insensitive' };
      const [data, total] = await Promise.all([
        this.client.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.client.user.count({ where }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('Admin getUsers failed', error);
      throw error;
    }
  }
  /**
   * Get boarding profiles pending approval
   * @param limit - The limit of the boarding profiles
   * @param offset - The offset of the boarding profiles
   * @param isApproved - The approved status of the boarding profiles
   * @returns The paginated response of the boarding profiles
   */
  async getBoardingPendingApproval(
    limit?: number,
    offset?: number,
    isApproved?: boolean,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const where: Prisma.BoardingProfileWhereInput =
        typeof isApproved === 'boolean'
          ? { isApproved }
          : { isApproved: false };
      const { take, skip } = getPaginationParams(limit, offset);
      const [data, total] = await Promise.all([
        this.client.boardingProfile.findMany({
          where,
          include: { host: { select: { id: true, name: true, email: true } } },
          orderBy: { id: 'desc' },
          take,
          skip,
        }),
        this.client.boardingProfile.count({ where }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('Admin getBoardingPending failed', error);
      throw error;
    }
  }

  /**
   * Get all orders
   * @param limit - The limit of the orders
   * @param offset - The offset of the orders
   * @param status - The status of the orders
   * @param from - The from date of the orders
   * @param to - The to date of the orders
   * @returns The paginated response of the orders
   */
  async getOrders(
    limit?: number,
    offset?: number,
    status?: string,
    from?: Date,
    to?: Date,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const { take, skip } = getPaginationParams(limit, offset);
      const where: Prisma.OrderWhereInput = {};
      if (status) where.status = status as OrderStatus;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) where.createdAt.lte = to;
      }
      const [data, total] = await Promise.all([
        this.client.order.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.client.order.count({ where }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('Admin getOrders failed', error);
      throw error;
    }
  }
  /**
   * Get dashboard summary (user count, booking count, order count, revenue, products, avg order value).
   * @returns The dashboard data (totalUsers, totalBookings, totalOrders, totalRevenue, totalProducts, avgOrderValue)
   */
  async getDashboard(): Promise<{
    totalUsers: number;
    totalBookings: number;
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    avgOrderValue: number;
  }> {
    try {
      const [userCount, bookingCount, orderCount, revenueResult, productCount] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.booking.count(),
          this.prisma.order.count(),
          this.prisma.order.aggregate({
            _sum: { total: true },
            where: { status: { not: OrderStatus.CANCELLED } },
          }),
          this.prisma.product.count(),
        ]);
      const revenue = revenueResult._sum.total ?? 0;
      const validOrdersCount = await this.prisma.order.count({
        where: { status: { not: OrderStatus.CANCELLED } },
      });
      const avgOrderValue = validOrdersCount > 0 ? revenue / validOrdersCount : 0;
      return {
        totalUsers: userCount,
        totalBookings: bookingCount,
        totalOrders: orderCount,
        totalRevenue: revenue,
        totalProducts: productCount,
        avgOrderValue,
      };
    } catch (error) {
      this.logger.error('Admin getDashboard failed', error);
      throw error;
    }
  }

  /**
   * Get bookings by status per month
   * @param year - The year of the bookings
   * @param month - The month of the bookings
   * @returns The bookings by status per month
   */
  async getBookingsByStatusPerMonth(
    year?: number,
    month?: number,
  ): Promise<BookingsByStatusPerMonthItem[]> {
    try {
      const yearParam = year ?? null;
      const monthParam = month ?? null;
      const rows = await this.client.$queryRaw<
        { month: Date; status: string; count: bigint }[]
      >`
        SELECT
          DATE_TRUNC('month', "createdAt")::date AS "month",
          status,
          COUNT(*)::bigint AS count
        FROM "Booking"
        WHERE (${yearParam}::int IS NULL OR EXTRACT(YEAR FROM "createdAt") = ${year})
          AND (${monthParam}::int IS NULL OR EXTRACT(MONTH FROM "createdAt") = ${month})
        GROUP BY 1, 2
        ORDER BY 1, 2
      `;
      return rows.map((r) => ({
        month: r.month.toISOString().slice(0, 10),
        status: r.status,
        count: Number(r.count),
      }));
    } catch (error) {
      this.logger.error('Admin getBookingsByStatusPerMonth failed', error);
      throw error;
    }
  }

  /**
   * Get revenue by month
   * @param year - The year of the revenue
   * @returns The revenue by month
   */
  async getRevenueByMonth(year?: number): Promise<RevenueByMonthItem[]> {
    try {
      const yearParam = year ?? null;
      const rows = await this.client.$queryRaw<
        { month: Date; revenue: Prisma.Decimal }[]
      >`
        SELECT
          DATE_TRUNC('month', "createdAt")::date AS "month",
          COALESCE(SUM("total"), 0) AS revenue
        FROM "Order"
        WHERE status != 'CANCELLED'
          AND (${yearParam}::int IS NULL OR EXTRACT(YEAR FROM "createdAt") = ${year})
        GROUP BY 1
        ORDER BY 1
      `;
      return rows.map((r) => ({
        month: r.month.toISOString().slice(0, 10),
        revenue: Number(r.revenue),
      }));
    } catch (error) {
      this.logger.error('Admin getRevenueByMonth failed', error);
      throw error;
    }
  }

  /**
   * Get top products
   * @param limit - The limit of the products
   * @returns The top products
   */
  async getTopProducts(limit = 10): Promise<TopProductItem[]> {
    try {
      const take = Math.min(Math.max(1, limit), 100);
      const rows = await this.client.$queryRaw<
        { productId: string; name: string; totalQuantity: bigint }[]
      >`
        SELECT
          p.id AS "productId",
          p.name,
          COALESCE(SUM(oi.quantity), 0)::bigint AS "totalQuantity"
        FROM "OrderItem" oi
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o.status != 'CANCELLED'
        GROUP BY p.id, p.name
        ORDER BY "totalQuantity" DESC
        LIMIT ${take}
      `;
      return rows.map((r) => ({
        productId: r.productId,
        name: r.name,
        totalQuantity: Number(r.totalQuantity),
      }));
    } catch (error) {
      this.logger.error('Admin getTopProducts failed', error);
      throw error;
    }
  }

  /**
   * Get top hosts
   * @param limit - The limit of the hosts
   * @returns The top hosts
   */
  async getTopHosts(limit = 10): Promise<TopHostItem[]> {
    try {
      const take = Math.min(Math.max(1, limit), 100);
      const rows = await this.client.$queryRaw<
        { hostId: string; hostName: string; bookingCount: bigint }[]
      >`
        SELECT
          u.id AS "hostId",
          u.name AS "hostName",
          COUNT(b.id)::bigint AS "bookingCount"
        FROM "Booking" b
        JOIN "BoardingProfile" bp ON bp.id = b."boardingProfileId"
        JOIN "User" u ON u.id = bp."hostId"
        GROUP BY u.id, u.name
        ORDER BY "bookingCount" DESC
        LIMIT ${take}
      `;
      return rows.map((r) => ({
        hostId: r.hostId,
        hostName: r.hostName,
        bookingCount: Number(r.bookingCount),
      }));
    } catch (error) {
      this.logger.error('Admin getTopHosts failed', error);
      throw error;
    }
  }

  /**
   * Suspend a user
   * @param userId - The ID of the user
   * @returns The suspended user
   */
  async suspendUser(
    userId: string,
  ): Promise<
    Prisma.UserGetPayload<{ select: typeof AdminService.userSelect }>
  > {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: AdminService.userSelect,
      });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Admin suspendUser failed', error);
      throw error;
    }
  }

  /**
   * User fields returned by activateUser/updateUserRole (excludes password and tokens).
   */
  private static readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    avatarUrl: true,
    isActive: true,
    createdAt: true,
  } as const;

  /**
   * Activate a user
   * @param userId - The ID of the user
   * @returns The activated user (safe fields only)
   */
  async activateUser(
    userId: string,
  ): Promise<
    Prisma.UserGetPayload<{ select: typeof AdminService.userSelect }>
  > {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
        select: AdminService.userSelect,
      });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Admin activateUser failed', error);
      throw error;
    }
  }

  /**
   * Update the role of a user
   * @param userId - The ID of the user
   * @param role - The role of the user
   * @returns The updated user (safe fields only)
   */
  async updateUserRole(
    userId: string,
    role: string,
  ): Promise<
    Prisma.UserGetPayload<{ select: typeof AdminService.userSelect }>
  > {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { role: role as never },
        select: AdminService.userSelect,
      });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Admin updateUserRole failed', error);
      throw error;
    }
  }

  /**
   * Export users as CSV with optional filters (role, email, date range on createdAt).
   */
  async exportUsersCsv(
    role?: string,
    email?: string,
    from?: Date,
    to?: Date,
  ): Promise<string> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (role) where.role = role as Role;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const users = await this.client.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'id,email,name,role,isActive,createdAt';
    const escape = (v: string | number | boolean | Date) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = users.map(
      (u) =>
        `${escape(u.id)},${escape(u.email)},${escape(u.name)},${escape(u.role)},${escape(u.isActive)},${escape(u.createdAt.toISOString())}`,
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Export orders as CSV with optional filters (status, date range on createdAt).
   */
  async exportOrdersCsv(
    status?: string,
    from?: Date,
    to?: Date,
  ): Promise<string> {
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as OrderStatus;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const orders = await this.client.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const escape = (v: string | number | boolean | Date) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const header =
      'orderId,userId,userName,userEmail,status,total,createdAt,itemsSummary';
    const rows = orders.map((o) => {
      const itemsSummary = o.items
        .map((i) => `${i.product.name}:${i.quantity}`)
        .join('; ');
      return `${escape(o.id)},${escape(o.user.id)},${escape(o.user.name)},${escape(o.user.email)},${escape(o.status)},${escape(o.total)},${escape(o.createdAt.toISOString())},${escape(itemsSummary)}`;
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Build a PDF buffer from a PDFKit document (streams into buffer).
   */
  private async bufferFromPdf(
    build: (doc: InstanceType<typeof PDFDocument>) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    });
  }

  /**
   * Export users as PDF with optional filters (role, email, date range).
   */
  async exportUsersPdf(
    role?: string,
    email?: string,
    from?: Date,
    to?: Date,
  ): Promise<Buffer> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (role) where.role = role as Role;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const users = await this.client.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.bufferFromPdf((doc) => {
      doc.fontSize(18).text('Users Export', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, {
        align: 'center',
      });
      doc.moveDown(1);
      const colWidths = [40, 120, 100, 50, 50, 90];
      const headers = ['ID', 'Email', 'Name', 'Role', 'Active', 'Created'];
      let y = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x, y, { width: colWidths[i], continued: false });
      });
      y += 18;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.font('Helvetica');
      for (const u of users) {
        y = doc.y + 6;
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const row = [
          String(u.id),
          u.email,
          u.name,
          u.role,
          u.isActive ? 'Yes' : 'No',
          u.createdAt.toISOString().slice(0, 19),
        ];
        row.forEach((cell, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.fontSize(8).text(cell, x, y, {
            width: colWidths[i],
            ellipsis: true,
          });
        });
        doc.y = y + 14;
      }
    });
  }

  /**
   * Export orders as PDF with optional filters (status, date range).
   */
  async exportOrdersPdf(
    status?: string,
    from?: Date,
    to?: Date,
  ): Promise<Buffer> {
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as OrderStatus;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const orders = await this.client.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.bufferFromPdf((doc) => {
      doc.fontSize(18).text('Orders Export', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, {
        align: 'center',
      });
      doc.moveDown(1);
      const colWidths = [45, 45, 80, 120, 60, 50, 95, 120];
      const headers = [
        'Order ID',
        'User ID',
        'User Name',
        'User Email',
        'Status',
        'Total',
        'Created',
        'Items',
      ];
      let y = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x, y, { width: colWidths[i], continued: false });
      });
      y += 18;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.font('Helvetica');
      for (const o of orders) {
        y = doc.y + 6;
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const itemsSummary = o.items
          .map((i) => `${i.product.name}: ${i.quantity}`)
          .join('; ');
        const row = [
          String(o.id),
          String(o.user.id),
          o.user.name,
          o.user.email,
          o.status,
          String(o.total),
          o.createdAt.toISOString().slice(0, 19),
          itemsSummary,
        ];
        row.forEach((cell, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.fontSize(7).text(cell, x, y, {
            width: colWidths[i],
            ellipsis: true,
          });
        });
        doc.y = y + 14;
      }
    });
  }
}
