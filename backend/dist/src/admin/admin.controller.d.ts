import { StreamableFile } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ReportsService } from '../reports/reports.service';
export declare class AdminController {
    private readonly adminService;
    private readonly reportsService;
    private readonly logger;
    constructor(adminService: AdminService, reportsService: ReportsService);
    health(): Promise<{
        status: string;
        prisma: boolean;
    }>;
    getUsers(pagination?: PaginationQueryDto, role?: string, email?: string): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    getBoardingPending(pagination?: PaginationQueryDto, isApproved?: string): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    getOrders(pagination?: PaginationQueryDto, status?: string, from?: string, to?: string): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
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
    getBookingsByStatusPerMonth(year?: string, month?: string): Promise<import("./admin.service").BookingsByStatusPerMonthItem[]>;
    getRevenueByMonth(year?: string): Promise<import("./admin.service").RevenueByMonthItem[]>;
    getRevenueComparison(): Promise<{
        currentMonthRevenue: number;
        lastMonthRevenue: number;
        percentageChange: number;
    }>;
    getTopProducts(limit?: string): Promise<import("./admin.service").TopProductItem[]>;
    getTopHosts(limit?: string): Promise<import("./admin.service").TopHostItem[]>;
    getPlatformGrowth(period?: 'daily' | 'monthly'): Promise<import("./admin.service").PlatformGrowthItem[]>;
    getSystemActivity(): Promise<import("./admin.service").SystemActivityItem[]>;
    getReportStats(): Promise<{
        total: number;
        pending: number;
        underReview: number;
        resolved: number;
        dismissed: number;
        actionTaken: number;
    }>;
    suspendUser(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    }>;
    activateUser(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    }>;
    updateUserRole(id: string, dto: UpdateUserRoleDto): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    }>;
    exportUsers(format?: string, role?: string, email?: string, from?: string, to?: string): Promise<StreamableFile>;
    exportOrders(format?: string, status?: string, from?: string, to?: string): Promise<StreamableFile>;
    exportSystemReport(): Promise<StreamableFile>;
}
