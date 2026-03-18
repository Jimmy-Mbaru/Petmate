import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
export interface BookingsByStatusPerMonthItem {
    month: string;
    status: string;
    count: number;
}
export interface RevenueByMonthItem {
    month: string;
    revenue: number;
    orderCount: number;
}
export interface TopProductItem {
    productId: string;
    name: string;
    totalQuantity: number;
}
export interface TopHostItem {
    hostId: string;
    hostName: string;
    bookingCount: number;
}
export interface PlatformGrowthItem {
    date: string;
    count: number;
}
export interface SystemActivityItem {
    date: string;
    bookings: number;
    orders: number;
    messages: number;
    newUsers: number;
}
export declare class AdminService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    healthCheck(): Promise<{
        status: string;
        prisma: boolean;
    }>;
    getPlatformGrowth(period?: 'daily' | 'monthly'): Promise<PlatformGrowthItem[]>;
    getSystemActivity(): Promise<SystemActivityItem[]>;
    exportSystemReportPdf(): Promise<Buffer>;
    getUsers(limit?: number, offset?: number, role?: string, email?: string): Promise<PaginatedResponse<unknown>>;
    getBoardingPendingApproval(limit?: number, offset?: number, isApproved?: boolean): Promise<PaginatedResponse<unknown>>;
    getOrders(limit?: number, offset?: number, status?: string, from?: Date, to?: Date): Promise<PaginatedResponse<unknown>>;
    getDashboard(): Promise<{
        totalUsers: number;
        totalBookings: number;
        totalOrders: number;
        totalRevenue: number;
        totalProducts: number;
        avgOrderValue: number;
    }>;
    getSystemStats(): Promise<{
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
    }>;
    getBookingsByStatusPerMonth(year?: number, month?: number): Promise<BookingsByStatusPerMonthItem[]>;
    getRevenueByMonth(year?: number): Promise<RevenueByMonthItem[]>;
    getRevenueComparison(): Promise<{
        currentMonthRevenue: number;
        lastMonthRevenue: number;
        percentageChange: number;
    }>;
    getTopProducts(limit?: number): Promise<TopProductItem[]>;
    getTopHosts(limit?: number): Promise<TopHostItem[]>;
    suspendUser(userId: string): Promise<Prisma.UserGetPayload<{
        select: typeof AdminService.userSelect;
    }>>;
    private static readonly userSelect;
    activateUser(userId: string): Promise<Prisma.UserGetPayload<{
        select: typeof AdminService.userSelect;
    }>>;
    updateUserRole(userId: string, role: string): Promise<Prisma.UserGetPayload<{
        select: typeof AdminService.userSelect;
    }>>;
    exportUsersCsv(role?: string, email?: string, from?: Date, to?: Date): Promise<string>;
    exportOrdersCsv(status?: string, from?: Date, to?: Date): Promise<string>;
    private bufferFromPdf;
    exportUsersPdf(role?: string, email?: string, from?: Date, to?: Date): Promise<Buffer>;
    exportOrdersPdf(status?: string, from?: Date, to?: Date): Promise<Buffer>;
}
