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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
const update_user_role_dto_1 = require("./dto/update-user-role.dto");
const admin_audit_interceptor_1 = require("../common/interceptors/admin-audit.interceptor");
const reports_service_1 = require("../reports/reports.service");
let AdminController = AdminController_1 = class AdminController {
    adminService;
    reportsService;
    logger = new common_1.Logger(AdminController_1.name);
    constructor(adminService, reportsService) {
        this.adminService = adminService;
        this.reportsService = reportsService;
    }
    async health() {
        return await this.adminService.healthCheck();
    }
    async getUsers(pagination, role, email) {
        try {
            this.logger.debug('Admin getUsers requested');
            return await this.adminService.getUsers(pagination?.limit, pagination?.offset, role, email);
        }
        catch (error) {
            this.logger.error('Admin getUsers failed', error?.stack);
            throw error;
        }
    }
    async getBoardingPending(pagination, isApproved) {
        try {
            this.logger.debug('Admin getBoardingPending requested');
            const parsed = typeof isApproved === 'string'
                ? isApproved.toLowerCase() === 'true'
                : undefined;
            return await this.adminService.getBoardingPendingApproval(pagination?.limit, pagination?.offset, parsed);
        }
        catch (error) {
            this.logger.error('Admin getBoardingPending failed', error?.stack);
            throw error;
        }
    }
    async getOrders(pagination, status, from, to) {
        try {
            this.logger.debug('Admin getOrders requested');
            const fromDate = from ? new Date(from) : undefined;
            const toDate = to ? new Date(to) : undefined;
            return await this.adminService.getOrders(pagination?.limit, pagination?.offset, status, fromDate, toDate);
        }
        catch (error) {
            this.logger.error('Admin getOrders failed', error?.stack);
            throw error;
        }
    }
    async getDashboard() {
        try {
            this.logger.debug('Admin getDashboard requested');
            return await this.adminService.getDashboard();
        }
        catch (error) {
            this.logger.error('Admin getDashboard failed', error?.stack);
            throw error;
        }
    }
    async getSystemStats() {
        try {
            this.logger.debug('Admin getSystemStats requested');
            return await this.adminService.getSystemStats();
        }
        catch (error) {
            this.logger.error('Admin getSystemStats failed', error?.stack);
            throw error;
        }
    }
    async getBookingsByStatusPerMonth(year, month) {
        try {
            this.logger.debug('Admin getBookingsByStatusPerMonth requested');
            const yearNum = year ? parseInt(year, 10) : undefined;
            const monthNum = month ? parseInt(month, 10) : undefined;
            const validMonth = monthNum !== undefined &&
                Number.isInteger(monthNum) &&
                monthNum >= 1 &&
                monthNum <= 12
                ? monthNum
                : undefined;
            return await this.adminService.getBookingsByStatusPerMonth(Number.isInteger(yearNum) ? yearNum : undefined, validMonth);
        }
        catch (error) {
            this.logger.error('Admin getBookingsByStatusPerMonth failed', error?.stack);
            throw error;
        }
    }
    async getRevenueByMonth(year) {
        try {
            this.logger.debug('Admin getRevenueByMonth requested');
            const yearNum = year ? parseInt(year, 10) : undefined;
            return await this.adminService.getRevenueByMonth(Number.isInteger(yearNum) ? yearNum : undefined);
        }
        catch (error) {
            this.logger.error('Admin getRevenueByMonth failed', error?.stack);
            throw error;
        }
    }
    async getRevenueComparison() {
        try {
            this.logger.debug('Admin getRevenueComparison requested');
            return await this.adminService.getRevenueComparison();
        }
        catch (error) {
            this.logger.error('Admin getRevenueComparison failed', error?.stack);
            throw error;
        }
    }
    async getTopProducts(limit) {
        try {
            this.logger.debug('Admin getTopProducts requested');
            const limitNum = limit ? parseInt(limit, 10) : 10;
            return await this.adminService.getTopProducts(Number.isInteger(limitNum) ? limitNum : 10);
        }
        catch (error) {
            this.logger.error('Admin getTopProducts failed', error?.stack);
            throw error;
        }
    }
    async getTopHosts(limit) {
        try {
            this.logger.debug('Admin getTopHosts requested');
            const limitNum = limit ? parseInt(limit, 10) : 10;
            return await this.adminService.getTopHosts(Number.isInteger(limitNum) ? limitNum : 10);
        }
        catch (error) {
            this.logger.error('Admin getTopHosts failed', error?.stack);
            throw error;
        }
    }
    async getPlatformGrowth(period) {
        try {
            this.logger.debug('Admin getPlatformGrowth requested');
            return await this.adminService.getPlatformGrowth(period || 'daily');
        }
        catch (error) {
            this.logger.error('Admin getPlatformGrowth failed', error?.stack);
            throw error;
        }
    }
    async getSystemActivity() {
        try {
            this.logger.debug('Admin getSystemActivity requested');
            return await this.adminService.getSystemActivity();
        }
        catch (error) {
            this.logger.error('Admin getSystemActivity failed', error?.stack);
            throw error;
        }
    }
    async getReportStats() {
        try {
            this.logger.debug('Admin getReportStats requested');
            return await this.reportsService.getStats();
        }
        catch (error) {
            this.logger.error('Admin getReportStats failed', error?.stack);
            throw error;
        }
    }
    async suspendUser(id) {
        try {
            this.logger.log(`Admin suspendUser requested for user ${id}`);
            return await this.adminService.suspendUser(id);
        }
        catch (error) {
            this.logger.error(`Admin suspendUser failed for user ${id}`, error?.stack);
            throw error;
        }
    }
    async activateUser(id) {
        try {
            this.logger.log(`Admin activateUser requested for user ${id}`);
            return await this.adminService.activateUser(id);
        }
        catch (error) {
            this.logger.error(`Admin activateUser failed for user ${id}`, error?.stack);
            throw error;
        }
    }
    async updateUserRole(id, dto) {
        try {
            this.logger.log(`Admin updateUserRole requested for user ${id} to role ${dto.role}`);
            return await this.adminService.updateUserRole(id, dto.role);
        }
        catch (error) {
            this.logger.error(`Admin updateUserRole failed for user ${id}`, error?.stack);
            throw error;
        }
    }
    async exportUsers(format, role, email, from, to) {
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        const dateStr = new Date().toISOString().slice(0, 10);
        const isPdf = (format ?? 'csv').toLowerCase() === 'pdf';
        if (isPdf) {
            const buffer = await this.adminService.exportUsersPdf(role, email, fromDate, toDate);
            return new common_1.StreamableFile(buffer, {
                type: 'application/pdf',
                disposition: `attachment; filename="users-export-${dateStr}.pdf"`,
            });
        }
        const csv = await this.adminService.exportUsersCsv(role, email, fromDate, toDate);
        return new common_1.StreamableFile(Buffer.from(csv, 'utf-8'), {
            type: 'text/csv; charset=utf-8',
            disposition: `attachment; filename="users-export-${dateStr}.csv"`,
        });
    }
    async exportOrders(format, status, from, to) {
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        const dateStr = new Date().toISOString().slice(0, 10);
        const isPdf = (format ?? 'csv').toLowerCase() === 'pdf';
        if (isPdf) {
            const buffer = await this.adminService.exportOrdersPdf(status, fromDate, toDate);
            return new common_1.StreamableFile(buffer, {
                type: 'application/pdf',
                disposition: `attachment; filename="orders-export-${dateStr}.pdf"`,
            });
        }
        const csv = await this.adminService.exportOrdersCsv(status, fromDate, toDate);
        return new common_1.StreamableFile(Buffer.from(csv, 'utf-8'), {
            type: 'text/csv; charset=utf-8',
            disposition: `attachment; filename="orders-export-${dateStr}.csv"`,
        });
    }
    async exportSystemReport() {
        try {
            this.logger.debug('Admin exportSystemReport requested');
            const buffer = await this.adminService.exportSystemReportPdf();
            const dateStr = new Date().toISOString().slice(0, 10);
            return new common_1.StreamableFile(buffer, {
                type: 'application/pdf',
                disposition: `attachment; filename="system-report-${dateStr}.pdf"`,
            });
        }
        catch (error) {
            this.logger.error('Admin exportSystemReport failed', error?.stack);
            throw error;
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin service health check' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is up' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'All users (paginated)' }),
    (0, swagger_1.ApiQuery)({
        name: 'role',
        required: false,
        description: 'Filter by role (OWNER, HOST, ADMIN)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'email',
        required: false,
        description: 'Filter by email (partial match)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of users (data, total, limit, offset)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('boarding'),
    (0, swagger_1.ApiOperation)({ summary: 'Boarding profiles pending approval (paginated)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiQuery)({
        name: 'isApproved',
        required: false,
        description: 'Filter by approval status (true/false). Default: false',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of boarding profiles with isApproved=false (data, total, limit, offset)',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('isApproved')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBoardingPending", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'All orders (paginated)' }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        description: 'Filter by order status',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'from',
        required: false,
        description: 'Filter orders created from this ISO date (inclusive)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'to',
        required: false,
        description: 'Filter orders created up to this ISO date (inclusive)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of all orders with user and items (data, total, limit, offset)',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({
        summary: 'Platform stats (users, bookings, orders, revenue)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Object with totalUsers, totalBookings, totalOrders, totalRevenue',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Comprehensive system statistics (users, boarding, store, activity)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Object with detailed breakdowns: users, boarding, store, and activity metrics',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemStats", null);
__decorate([
    (0, common_1.Get)('analytics/bookings-by-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Bookings count by status per month' }),
    (0, swagger_1.ApiQuery)({
        name: 'year',
        required: false,
        type: Number,
        description: 'Filter by year (e.g. 2025)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'month',
        required: false,
        type: Number,
        description: 'Filter by month 1–12',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { month, status, count }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBookingsByStatusPerMonth", null);
__decorate([
    (0, common_1.Get)('analytics/revenue-by-month'),
    (0, swagger_1.ApiOperation)({ summary: 'Revenue by month (excludes cancelled orders)' }),
    (0, swagger_1.ApiQuery)({
        name: 'year',
        required: false,
        type: Number,
        description: 'Filter by year (e.g. 2025)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { month, revenue }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRevenueByMonth", null);
__decorate([
    (0, common_1.Get)('analytics/revenue-comparison'),
    (0, swagger_1.ApiOperation)({ summary: 'Revenue comparison between this month and last month' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Object with currentMonthRevenue, lastMonthRevenue, percentageChange',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRevenueComparison", null);
__decorate([
    (0, common_1.Get)('analytics/top-products'),
    (0, swagger_1.ApiOperation)({ summary: 'Top products by quantity sold (excludes cancelled orders)' }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Max items to return (default 10, max 100)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { productId, name, totalQuantity }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTopProducts", null);
__decorate([
    (0, common_1.Get)('analytics/top-hosts'),
    (0, swagger_1.ApiOperation)({ summary: 'Top hosts by booking count' }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Max items to return (default 10, max 100)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { hostId, hostName, bookingCount }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTopHosts", null);
__decorate([
    (0, common_1.Get)('analytics/platform-growth'),
    (0, swagger_1.ApiOperation)({ summary: 'User registrations over time' }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        required: false,
        enum: ['daily', 'monthly'],
        description: 'Aggregation period (default daily)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { date, count }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPlatformGrowth", null);
__decorate([
    (0, common_1.Get)('analytics/system-activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Daily counts of key actions (bookings, orders, etc.)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of { date, bookings, orders, messages, newUsers }',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemActivity", null);
__decorate([
    (0, common_1.Get)('reports/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user report statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Aggregated user report statistics: total, pending, underReview, resolved, dismissed, actionTaken',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReportStats", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a user account (set isActive=false)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User suspended (isActive=false) and basic profile returned',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate a user account (set isActive=true)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'User ID (UUID)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User activated (isActive=true) and basic profile returned',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "activateUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a user role (e.g. OWNER, HOST, ADMIN)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'User ID (UUID)' }),
    (0, swagger_1.ApiBody)({ type: update_user_role_dto_1.UpdateUserRoleDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User role updated and basic profile returned',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_role_dto_1.UpdateUserRoleDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserRole", null);
__decorate([
    (0, common_1.Get)('export/users'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export users as CSV or PDF (with filters and date range)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'format',
        required: false,
        enum: ['csv', 'pdf'],
        description: 'Export format: csv (default) or pdf',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'role',
        required: false,
        description: 'Filter by role (OWNER, HOST, ADMIN)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'email',
        required: false,
        description: 'Filter by email (partial match)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'from',
        required: false,
        description: 'From date (ISO) for createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'to',
        required: false,
        description: 'To date (ISO) for createdAt',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File download (CSV or PDF)',
        content: {
            'text/csv': { schema: { type: 'string', format: 'binary' } },
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('email')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportUsers", null);
__decorate([
    (0, common_1.Get)('export/orders'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export orders as CSV or PDF (with filters and date range)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'format',
        required: false,
        enum: ['csv', 'pdf'],
        description: 'Export format: csv (default) or pdf',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        description: 'Filter by order status',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'from',
        required: false,
        description: 'From date (ISO) for createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'to',
        required: false,
        description: 'To date (ISO) for createdAt',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File download (CSV or PDF)',
        content: {
            'text/csv': { schema: { type: 'string', format: 'binary' } },
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportOrders", null);
__decorate([
    (0, common_1.Get)('export/system-report'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export a comprehensive system report as PDF',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File download (PDF)',
        content: {
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportSystemReport", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)(admin_audit_interceptor_1.AdminAuditInterceptor),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        reports_service_1.ReportsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map