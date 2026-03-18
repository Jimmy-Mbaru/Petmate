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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
let AdminService = class AdminService {
    static { AdminService_1 = this; }
    prisma;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return { status: 'ok', prisma: true };
        }
        catch (error) {
            this.logger.error('Health check failed', error);
            return { status: 'error', prisma: false };
        }
    }
    async getPlatformGrowth(period = 'daily') {
        try {
            const isMonthly = period === 'monthly';
            const seriesFormat = isMonthly ? 'month' : 'day';
            const seriesCount = isMonthly ? 5 : 29;
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getPlatformGrowth failed', error);
            throw error;
        }
    }
    async getSystemActivity() {
        try {
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getSystemActivity failed', error);
            throw error;
        }
    }
    async exportSystemReportPdf() {
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
            doc.save();
            doc.opacity(0.1);
            for (let x = 0; x < 600; x += 24) {
                for (let y = 0; y < 800; y += 24) {
                    doc.circle(x, y, 1).fill(brandRed);
                }
            }
            doc.restore();
            doc.rect(0, 0, 612, 120).fill(brandRed);
            doc.fillColor('#ffffff');
            doc.fontSize(28).font('Helvetica-Bold').text('PetMate', 50, 40);
            doc.fontSize(16).font('Helvetica').text('Comprehensive System Report', 50, 75);
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 80, { align: 'right', width: 160 });
            doc.moveDown(4);
            let y = 140;
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
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.text(g.date, 60, y);
                doc.text(g.count.toString(), 250, y);
                y += 15;
            });
            y += 20;
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
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.text(r.month, 60, y);
                doc.text(`KES ${r.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 250, y);
                y += 15;
            });
            y += 20;
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
    async getUsers(limit, offset, role, email) {
        try {
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const where = {};
            if (role)
                where.role = role;
            if (email)
                where.email = { contains: email, mode: 'insensitive' };
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
        }
        catch (error) {
            this.logger.error('Admin getUsers failed', error);
            throw error;
        }
    }
    async getBoardingPendingApproval(limit, offset, isApproved) {
        try {
            const where = typeof isApproved === 'boolean'
                ? { isApproved }
                : { isApproved: false };
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
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
        }
        catch (error) {
            this.logger.error('Admin getBoardingPending failed', error);
            throw error;
        }
    }
    async getOrders(limit, offset, status, from, to) {
        try {
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const where = {};
            if (status)
                where.status = status;
            if (from || to) {
                where.createdAt = {};
                if (from)
                    where.createdAt.gte = from;
                if (to)
                    where.createdAt.lte = to;
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
        }
        catch (error) {
            this.logger.error('Admin getOrders failed', error);
            throw error;
        }
    }
    async getDashboard() {
        try {
            const [userCount, bookingCount, orderCount, revenueResult, productCount] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.booking.count(),
                this.prisma.order.count(),
                this.prisma.order.aggregate({
                    _sum: { total: true },
                    where: { status: { not: client_1.OrderStatus.CANCELLED } },
                }),
                this.prisma.product.count(),
            ]);
            const revenue = revenueResult._sum.total ?? 0;
            const validOrdersCount = await this.prisma.order.count({
                where: { status: { not: client_1.OrderStatus.CANCELLED } },
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
        }
        catch (error) {
            this.logger.error('Admin getDashboard failed', error);
            throw error;
        }
    }
    async getSystemStats() {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const [userCount, activeUserCount, inactiveUserCount, adminCount, newUsersLast30Days, boardingTotal, approvedBoarding, pendingBoarding, bookingTotal, activeBookings, productCount, activeProducts, orderCount, revenueResult, bookingsLast24h,] = await Promise.all([
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
                    where: { status: { not: client_1.OrderStatus.CANCELLED } },
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
        }
        catch (error) {
            this.logger.error('Admin getSystemStats failed', error);
            throw error;
        }
    }
    async getBookingsByStatusPerMonth(year, month) {
        try {
            const yearParam = year ?? null;
            const monthParam = month ?? null;
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getBookingsByStatusPerMonth failed', error);
            throw error;
        }
    }
    async getRevenueByMonth(year) {
        try {
            const targetYear = year || new Date().getFullYear();
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getRevenueByMonth failed', error);
            throw error;
        }
    }
    async getRevenueComparison() {
        try {
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
            const [currentMonthResult, lastMonthResult] = await Promise.all([
                this.prisma.order.aggregate({
                    _sum: { total: true },
                    where: {
                        status: { not: client_1.OrderStatus.CANCELLED },
                        createdAt: { gte: currentMonthStart },
                    },
                }),
                this.prisma.order.aggregate({
                    _sum: { total: true },
                    where: {
                        status: { not: client_1.OrderStatus.CANCELLED },
                        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
                    },
                }),
            ]);
            const currentMonthRevenue = currentMonthResult._sum.total ?? 0;
            const lastMonthRevenue = lastMonthResult._sum.total ?? 0;
            let percentageChange = 0;
            if (lastMonthRevenue > 0) {
                percentageChange = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
            }
            else if (currentMonthRevenue > 0) {
                percentageChange = 100;
            }
            return {
                currentMonthRevenue,
                lastMonthRevenue,
                percentageChange: Math.round(percentageChange * 100) / 100,
            };
        }
        catch (error) {
            this.logger.error('Admin getRevenueComparison failed', error);
            throw error;
        }
    }
    async getTopProducts(limit = 10) {
        try {
            const take = Math.min(Math.max(1, limit), 100);
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getTopProducts failed', error);
            throw error;
        }
    }
    async getTopHosts(limit = 10) {
        try {
            const take = Math.min(Math.max(1, limit), 100);
            const rows = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error('Admin getTopHosts failed', error);
            throw error;
        }
    }
    async suspendUser(userId) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const updated = await this.prisma.user.update({
                where: { id: userId },
                data: { isActive: false },
                select: AdminService_1.userSelect,
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Admin suspendUser failed', error);
            throw error;
        }
    }
    static userSelect = {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
    };
    async activateUser(userId) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const updated = await this.prisma.user.update({
                where: { id: userId },
                data: { isActive: true },
                select: AdminService_1.userSelect,
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Admin activateUser failed', error);
            throw error;
        }
    }
    async updateUserRole(userId, role) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const updated = await this.prisma.user.update({
                where: { id: userId },
                data: { role: role },
                select: AdminService_1.userSelect,
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Admin updateUserRole failed', error);
            throw error;
        }
    }
    async exportUsersCsv(role, email, from, to) {
        const where = { deletedAt: null };
        if (role)
            where.role = role;
        if (email)
            where.email = { contains: email, mode: 'insensitive' };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
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
        const escape = (v) => {
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };
        const rows = users.map((u) => `${escape(u.id)},${escape(u.email)},${escape(u.name)},${escape(u.role)},${escape(u.isActive)},${escape(u.createdAt.toISOString())}`);
        return [header, ...rows].join('\n');
    }
    async exportOrdersCsv(status, from, to) {
        const where = {};
        if (status)
            where.status = status;
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
        }
        const orders = await this.prisma.order.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: { include: { product: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const escape = (v) => {
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };
        const header = 'orderId,userId,userName,userEmail,status,total,createdAt,itemsSummary';
        const rows = orders.map((o) => {
            const itemsSummary = o.items
                .map((i) => `${i.product.name}:${i.quantity}`)
                .join('; ');
            return `${escape(o.id)},${escape(o.user.id)},${escape(o.user.name)},${escape(o.user.email)},${escape(o.status)},${escape(o.total)},${escape(o.createdAt.toISOString())},${escape(itemsSummary)}`;
        });
        return [header, ...rows].join('\n');
    }
    async bufferFromPdf(build) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            build(doc);
            doc.end();
        });
    }
    async exportUsersPdf(role, email, from, to) {
        const where = { deletedAt: null };
        if (role)
            where.role = role;
        if (email)
            where.email = { contains: email, mode: 'insensitive' };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
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
            doc.save();
            doc.opacity(0.05);
            for (let x = 0; x < 600; x += 30) {
                for (let y = 0; y < 800; y += 30) {
                    doc.circle(x, y, 0.5).fill(brandRed);
                }
            }
            doc.restore();
            doc.rect(0, 0, 612, 100).fill(brandRed);
            doc.fillColor('#ffffff');
            doc.fontSize(24).font('Helvetica-Bold').text('PetMate', 50, 35);
            doc.fontSize(14).font('Helvetica').text('Platform Users Report', 50, 65);
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 65, { align: 'right', width: 160 });
            doc.moveDown(3);
            let y = 120;
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
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fillColor(textGray).fontSize(8);
                doc.text(`© 2026 PetMate Platform - Page ${i + 1} of ${pages.count}`, 50, 780, { align: 'center', width: 512 });
            }
        });
    }
    async exportOrdersPdf(status, from, to) {
        const where = {};
        if (status)
            where.status = status;
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
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
            doc.save();
            doc.opacity(0.05);
            for (let x = 0; x < 600; x += 30) {
                for (let y = 0; y < 800; y += 30) {
                    doc.circle(x, y, 0.5).fill(brandRed);
                }
            }
            doc.restore();
            doc.rect(0, 0, 612, 100).fill(brandRed);
            doc.fillColor('#ffffff');
            doc.fontSize(24).font('Helvetica-Bold').text('PetMate', 50, 35);
            doc.fontSize(14).font('Helvetica').text('Platform Orders Report', 50, 65);
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 400, 65, { align: 'right', width: 160 });
            doc.moveDown(3);
            let y = 120;
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
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fillColor(textGray).fontSize(8);
                doc.text(`© 2026 PetMate Platform - Page ${i + 1} of ${pages.count}`, 50, 780, { align: 'center', width: 512 });
            }
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map