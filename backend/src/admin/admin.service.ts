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
 * Revenue totals and order counts grouped by month (for dashboard analytics).
 */
export interface RevenueByMonthItem {
  month: string;
  revenue: number;
  orderCount: number;
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
 * User registrations grouped by day/month (for platform growth).
 */
export interface PlatformGrowthItem {
  date: string;
  count: number;
}

/**
 * Platform activity counts (bookings, orders, messages, etc.) per day.
 */
export interface SystemActivityItem {
  date: string;
  bookings: number;
  orders: number;
  messages: number;
  newUsers: number;
}

/**
 * Admin service: user management, boarding approval, orders, and dashboard analytics.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simple health check to verify service and prisma connectivity.
   */
  async healthCheck(): Promise<{ status: string; prisma: boolean }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', prisma: true };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return { status: 'error', prisma: false };
    }
  }

  /**
   * Get platform growth (cumulative user registrations over time).
   * @param period - 'daily' or 'monthly'
   * @returns Array of { date, count }
   */
  async getPlatformGrowth(
    period: 'daily' | 'monthly' = 'daily',
  ): Promise<PlatformGrowthItem[]> {
    try {
      const isMonthly = period === 'monthly';
      const seriesFormat = isMonthly ? 'month' : 'day';
      const seriesCount = isMonthly ? 5 : 29; // 6 months or 30 days

      const rows = await this.prisma.$queryRaw<
        { date: Date; count: bigint }[]
      >`
        WITH date_series AS (
          SELECT (DATE_TRUNC(${seriesFormat}, CURRENT_DATE) - (i * (CASE WHEN ${isMonthly} THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END)))::date AS d
          FROM generate_series(0, ${seriesCount}) AS i
        ),
        counts AS (
          SELECT DATE_TRUNC(${seriesFormat}, "createdAt")::date AS d, COUNT(*) AS c
          FROM "User"
          GROUP BY 1
        ),
        starting_base AS (
          SELECT COUNT(*)::bigint as total
          FROM "User"
          WHERE "createdAt" < (SELECT MIN(d) FROM date_series)
        )
        SELECT
          ds.d AS "date",
          ((SELECT total FROM starting_base) + SUM(COALESCE(c.c, 0)) OVER (ORDER BY ds.d))::bigint AS count
        FROM date_series ds
        LEFT JOIN counts c ON c.d = ds.d
        ORDER BY 1 ASC
      `;

      return rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        count: Number(r.count),
      }));
    } catch (error) {
      this.logger.error('Admin getPlatformGrowth failed', error);
      throw error;
    }
  }

  /**
   * Get system activity (daily counts of key actions).
   * @returns Array of { date, bookings, orders, messages, newUsers }
   */
  async getSystemActivity(): Promise<SystemActivityItem[]> {
    try {
      const rows = await this.prisma.$queryRaw<
        {
          date: Date;
          bookings: bigint;
          orders: bigint;
          messages: bigint;
          users: bigint;
        }[]
      >`
        WITH date_series AS (
          SELECT (CURRENT_DATE - i)::date AS d
          FROM generate_series(0, 29) AS i
        ),
        b AS (SELECT DATE_TRUNC('day', "createdAt")::date AS d, COUNT(*) AS c FROM "Booking" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days' GROUP BY 1),
        o AS (SELECT DATE_TRUNC('day', "createdAt")::date AS d, COUNT(*) AS c FROM "Order" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days' GROUP BY 1),
        m AS (SELECT DATE_TRUNC('day', "sentAt")::date AS d, COUNT(*) AS c FROM "Message" WHERE "sentAt" >= CURRENT_DATE - INTERVAL '30 days' GROUP BY 1),
        u AS (SELECT DATE_TRUNC('day', "createdAt")::date AS d, COUNT(*) AS c FROM "User" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days' GROUP BY 1)
        SELECT
          date_series.d AS "date",
          COALESCE(b.c, 0)::bigint AS bookings,
          COALESCE(o.c, 0)::bigint AS orders,
          COALESCE(m.c, 0)::bigint AS messages,
          COALESCE(u.c, 0)::bigint AS users
        FROM date_series
        LEFT JOIN b ON b.d = date_series.d
        LEFT JOIN o ON o.d = date_series.d
        LEFT JOIN m ON m.d = date_series.d
        LEFT JOIN u ON u.d = date_series.d
        ORDER BY 1 ASC
      `;
      return rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        bookings: Number(r.bookings),
        orders: Number(r.orders),
        messages: Number(r.messages),
        newUsers: Number(r.users),
      }));
    } catch (error) {
      this.logger.error('Admin getSystemActivity failed', error);
      throw error;
    }
  }

  /**
   * Export a comprehensive system report as PDF.
   */
  async exportSystemReportPdf(): Promise<Buffer> {
    const stats = await this.getSystemStats();
    const revenue = await this.getRevenueByMonth();
    const topProducts = await this.getTopProducts(5);
    const topHosts = await this.getTopHosts(5);
    const growth = await this.getPlatformGrowth('monthly');

    return this.bufferFromPdf((doc) => {
      const brandRed = '#d72323';
      const brandSurface = '#f5eded';
      const textDark = '#000000';
      const textGray = '#363636';

      // Background Pattern (dots)
      doc.save();
      doc.opacity(0.1);
      for (let x = 0; x < 600; x += 24) {
        for (let y = 0; y < 800; y += 24) {
          doc.circle(x, y, 1).fill(brandRed);
        }
      }
      doc.restore();

      // Header with brand color
      doc.rect(0, 0, 612, 120).fill(brandRed);
      doc.fillColor('#ffffff');
      doc.fontSize(28).font('Helvetica-Bold').text('PetMate', 50, 40);
      doc.fontSize(16).font('Helvetica').text('Comprehensive System Report', 50, 75);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 80, { align: 'right', width: 160 });

      doc.moveDown(4);
      let y = 140;

      // Section: Executive Summary
      doc.fillColor(brandRed);
      doc.fontSize(18).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', 50, y);
      doc.rect(50, y + 22, 512, 2).fill(brandRed);
      y += 40;

      doc.fillColor(textDark);
      doc.fontSize(12).font('Helvetica');
      
      const summaryStats = [
        { label: 'Total Platform Users', value: stats.users.total.toLocaleString() },
        { label: 'Verified Boarding Hosts', value: stats.boarding.approvedProfiles.toLocaleString() },
        { label: 'Total Bookings Processed', value: stats.boarding.totalBookings.toLocaleString() },
        { label: 'Gross Store Revenue', value: `KES ${stats.store.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      ];

      summaryStats.forEach((stat) => {
        doc.fillColor(textGray).text(stat.label, 60, y);
        doc.fillColor(textDark).font('Helvetica-Bold').text(stat.value, 250, y);
        doc.font('Helvetica');
        y += 20;
      });

      y += 20;

      // Section: Platform Growth
      doc.fillColor(brandRed);
      doc.fontSize(18).font('Helvetica-Bold').text('PLATFORM GROWTH', 50, y);
      doc.rect(50, y + 22, 512, 2).fill(brandRed);
      y += 40;

      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold');
      doc.text('Month', 60, y);
      doc.text('New Registrations (Cumulative)', 250, y);
      y += 15;
      doc.font('Helvetica');
      
      growth.slice(-6).forEach(g => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.text(g.date, 60, y);
        doc.text(g.count.toString(), 250, y);
        y += 15;
      });

      y += 20;

      // Section: Financials
      doc.fillColor(brandRed);
      doc.fontSize(18).font('Helvetica-Bold').text('REVENUE TRENDS', 50, y);
      doc.rect(50, y + 22, 512, 2).fill(brandRed);
      y += 40;

      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold');
      doc.text('Period', 60, y);
      doc.text('Store Revenue', 250, y);
      y += 15;
      doc.font('Helvetica');

      revenue.slice(-6).forEach(r => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.text(r.month, 60, y);
        doc.text(`KES ${r.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 250, y);
        y += 15;
      });

      y += 20;

      // Section: Top Performers
      doc.fillColor(brandRed);
      doc.fontSize(18).font('Helvetica-Bold').text('TOP PERFORMERS', 50, y);
      doc.rect(50, y + 22, 512, 2).fill(brandRed);
      y += 40;

      doc.fillColor(textDark).fontSize(12).font('Helvetica-Bold').text('Best Selling Products', 60, y);
      y += 20;
      doc.fontSize(10).font('Helvetica');
      topProducts.forEach((p, i) => {
        doc.text(`${i + 1}. ${p.name}`, 70, y);
        doc.text(`${p.totalQuantity} units sold`, 250, y);
        y += 15;
      });

      y += 15;
      doc.fontSize(12).font('Helvetica-Bold').text('Most Active Hosts', 60, y);
      y += 20;
      doc.fontSize(10).font('Helvetica');
      topHosts.forEach((h, i) => {
        doc.text(`${i + 1}. ${h.hostName}`, 70, y);
        doc.text(`${h.bookingCount} bookings`, 250, y);
        y += 15;
      });

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(0, 792, 612, 50).fill(brandSurface);
        doc.fillColor(textGray);
        doc.fontSize(8).text('© 2026 PetMate Platform - Confidential internal document', 50, 810, { align: 'center', width: 512 });
        doc.text(`Page ${i + 1} of ${pages.count}`, 50, 810, { align: 'right', width: 512 });
      }
    });
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
        this.prisma.user.findMany({
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
        this.prisma.user.count({ where }),
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
        this.prisma.boardingProfile.findMany({
          where,
          include: { host: { select: { id: true, name: true, email: true } } },
          orderBy: { id: 'desc' },
          take,
          skip,
        }),
        this.prisma.boardingProfile.count({ where }),
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
        this.prisma.order.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.prisma.order.count({ where }),
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
   * Get comprehensive system statistics with detailed breakdowns.
   * @returns Extended system stats including users, boarding, store, and activity metrics.
   */
  async getSystemStats(): Promise<{
    users: {
      total: number;
      active: number;
      inactive: number;
      admins: number;
      newLast30Days: number;
    };
    boarding: {
      totalProfiles: number;
      approvedProfiles: number;
      pendingProfiles: number;
      totalBookings: number;
      activeBookings: number;
    };
    store: {
      totalProducts: number;
      activeProducts: number;
      totalOrders: number;
      totalRevenue: number;
    };
    activity: {
      loginsLast24h: number;
      messagesLast24h: number;
      bookingsLast24h: number;
    };
  }> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        userCount,
        activeUserCount,
        inactiveUserCount,
        adminCount,
        newUsersLast30Days,
        boardingTotal,
        approvedBoarding,
        pendingBoarding,
        bookingTotal,
        activeBookings,
        productCount,
        activeProducts,
        orderCount,
        revenueResult,
        bookingsLast24h,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        this.prisma.boardingProfile.count(),
        this.prisma.boardingProfile.count({ where: { isApproved: true } }),
        this.prisma.boardingProfile.count({ where: { isApproved: false } }),
        this.prisma.booking.count(),
        this.prisma.booking.count({ where: { status: { in: ['PENDING', 'ACCEPTED'] } } }),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: { status: { not: OrderStatus.CANCELLED } },
        }),
        this.prisma.booking.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
      ]);

      return {
        users: {
          total: userCount,
          active: activeUserCount,
          inactive: inactiveUserCount,
          admins: adminCount,
          newLast30Days: newUsersLast30Days,
        },
        boarding: {
          totalProfiles: boardingTotal,
          approvedProfiles: approvedBoarding,
          pendingProfiles: pendingBoarding,
          totalBookings: bookingTotal,
          activeBookings: activeBookings,
        },
        store: {
          totalProducts: productCount,
          activeProducts: activeProducts,
          totalOrders: orderCount,
          totalRevenue: revenueResult._sum.total ?? 0,
        },
        activity: {
          loginsLast24h: 0,
          messagesLast24h: 0,
          bookingsLast24h: bookingsLast24h,
        },
      };
    } catch (error) {
      this.logger.error('Admin getSystemStats failed', error);
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
      const rows = await this.prisma.$queryRaw<
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
   * Get revenue and sales volume trend by month.
   * @param year - The year of the revenue
   * @returns The revenue by month
   */
  async getRevenueByMonth(year?: number): Promise<RevenueByMonthItem[]> {
    try {
      const targetYear = year || new Date().getFullYear();
      const rows = await this.prisma.$queryRaw<
        { month: Date; revenue: Prisma.Decimal; orders: bigint }[]
      >`
        WITH months AS (
          SELECT (DATE_TRUNC('year', CAST(${targetYear} || '-01-01' AS DATE)) + (i || ' month')::interval)::date AS m
          FROM generate_series(0, 11) AS i
        ),
        stats AS (
          SELECT
            DATE_TRUNC('month', "createdAt")::date AS m,
            SUM("total") AS r,
            COUNT(*)::bigint AS c
          FROM "Order"
          WHERE status != 'CANCELLED'
            AND EXTRACT(YEAR FROM "createdAt") = ${targetYear}
          GROUP BY 1
        )
        SELECT
          months.m AS "month",
          COALESCE(stats.r, 0) AS revenue,
          COALESCE(stats.c, 0)::bigint AS orders
        FROM months
        LEFT JOIN stats ON stats.m = months.m
        ORDER BY 1 ASC
      `;
      return rows.map((r) => ({
        month: r.month instanceof Date ? r.month.toISOString().slice(0, 10) : String(r.month),
        revenue: Number(r.revenue),
        orderCount: Number(r.orders),
      }));
    } catch (error) {
      this.logger.error('Admin getRevenueByMonth failed', error);
      throw error;
    }
  }

  /**
   * Get revenue comparison between this month and last month
   * @returns Object with currentMonthRevenue, lastMonthRevenue, and percentageChange
   */
  async getRevenueComparison(): Promise<{
    currentMonthRevenue: number;
    lastMonthRevenue: number;
    percentageChange: number;
  }> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

      const [currentMonthResult, lastMonthResult] = await Promise.all([
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: { not: OrderStatus.CANCELLED },
            createdAt: { gte: currentMonthStart },
          },
        }),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: { not: OrderStatus.CANCELLED },
            createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
          },
        }),
      ]);

      const currentMonthRevenue = currentMonthResult._sum.total ?? 0;
      const lastMonthRevenue = lastMonthResult._sum.total ?? 0;

      let percentageChange = 0;
      if (lastMonthRevenue > 0) {
        percentageChange = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else if (currentMonthRevenue > 0) {
        percentageChange = 100; // New revenue this month
      }

      return {
        currentMonthRevenue,
        lastMonthRevenue,
        percentageChange: Math.round(percentageChange * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Admin getRevenueComparison failed', error);
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
      const rows = await this.prisma.$queryRaw<
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
      const rows = await this.prisma.$queryRaw<
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
    const users = await this.prisma.user.findMany({
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
    const orders = await this.prisma.order.findMany({
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
    const users = await this.prisma.user.findMany({
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
      const brandRed = '#d72323';
      const brandSurface = '#f5eded';
      const textDark = '#000000';
      const textGray = '#363636';

      // Background Pattern
      doc.save();
      doc.opacity(0.05);
      for (let x = 0; x < 600; x += 30) {
        for (let y = 0; y < 800; y += 30) {
          doc.circle(x, y, 0.5).fill(brandRed);
        }
      }
      doc.restore();

      // Header
      doc.rect(0, 0, 612, 100).fill(brandRed);
      doc.fillColor('#ffffff');
      doc.fontSize(24).font('Helvetica-Bold').text('PetMate', 50, 35);
      doc.fontSize(14).font('Helvetica').text('Platform Users Report', 50, 65);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 65, { align: 'right', width: 160 });

      doc.moveDown(3);
      let y = 120;

      // Table Header
      const colWidths = [40, 140, 120, 60, 60, 90];
      const headers = ['ID', 'Email', 'Name', 'Role', 'Status', 'Joined'];
      
      doc.rect(50, y - 5, 512, 25).fill(brandSurface);
      doc.fillColor(brandRed).fontSize(10).font('Helvetica-Bold');
      
      headers.forEach((h, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x + 5, y);
      });

      y += 25;
      doc.font('Helvetica').fontSize(8).fillColor(textDark);

      for (const u of users) {
        if (y > 730) {
          doc.addPage();
          y = 50;
          // Re-draw header on new page if needed or just continue
        }

        const row = [
          u.id.substring(0, 4) + '...',
          u.email,
          u.name,
          u.role,
          u.isActive ? 'Active' : 'Suspended',
          u.createdAt.toISOString().slice(0, 10),
        ];

        doc.rect(50, y - 2, 512, 20).fill(users.indexOf(u) % 2 === 0 ? '#ffffff' : '#fafafa');
        doc.fillColor(textDark);

        row.forEach((cell, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(cell, x + 5, y, {
            width: colWidths[i] - 5,
            ellipsis: true,
          });
        });

        y += 20;
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(textGray).fontSize(8);
        doc.text(`© 2026 PetMate Platform - Page ${i + 1} of ${pages.count}`, 50, 780, { align: 'center', width: 512 });
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
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.bufferFromPdf((doc) => {
      const brandRed = '#d72323';
      const brandSurface = '#f5eded';
      const textDark = '#000000';
      const textGray = '#363636';

      // Background Pattern
      doc.save();
      doc.opacity(0.05);
      for (let x = 0; x < 600; x += 30) {
        for (let y = 0; y < 800; y += 30) {
          doc.circle(x, y, 0.5).fill(brandRed);
        }
      }
      doc.restore();

      // Header
      doc.rect(0, 0, 612, 100).fill(brandRed);
      doc.fillColor('#ffffff');
      doc.fontSize(24).font('Helvetica-Bold').text('PetMate', 50, 35);
      doc.fontSize(14).font('Helvetica').text('Platform Orders Report', 50, 65);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 65, { align: 'right', width: 160 });

      doc.moveDown(3);
      let y = 120;

      // Table Header
      const colWidths = [100, 140, 80, 80, 112];
      const headers = ['Order ID', 'Customer', 'Status', 'Total', 'Created'];
      
      doc.rect(50, y - 5, 512, 25).fill(brandSurface);
      doc.fillColor(brandRed).fontSize(10).font('Helvetica-Bold');
      
      headers.forEach((h, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x + 5, y);
      });

      y += 25;
      doc.font('Helvetica').fontSize(8).fillColor(textDark);

      for (const o of orders) {
        if (y > 730) {
          doc.addPage();
          y = 50;
        }

        const row = [
          o.id.substring(0, 8) + '...',
          o.user.name,
          o.status,
          `KES ${o.total.toLocaleString()}`,
          o.createdAt.toISOString().slice(0, 10),
        ];

        doc.rect(50, y - 2, 512, 20).fill(orders.indexOf(o) % 2 === 0 ? '#ffffff' : '#fafafa');
        doc.fillColor(textDark);

        row.forEach((cell, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(cell, x + 5, y, {
            width: colWidths[i] - 5,
            ellipsis: true,
          });
        });

        y += 20;
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(textGray).fontSize(8);
        doc.text(`© 2026 PetMate Platform - Page ${i + 1} of ${pages.count}`, 50, 780, { align: 'center', width: 512 });
      }
    });
  }
}
