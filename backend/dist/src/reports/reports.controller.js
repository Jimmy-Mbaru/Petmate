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
var ReportsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const create_report_dto_1 = require("./dto/create-report.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let ReportsController = ReportsController_1 = class ReportsController {
    reportsService;
    logger = new common_1.Logger(ReportsController_1.name);
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async createReport(user, dto) {
        try {
            this.logger.log(`Create report: user ${user.id} reporting ${dto.reportedUserId}`);
            return await this.reportsService.createReport(user.id, dto);
        }
        catch (error) {
            this.logger.error('Create report failed', error);
            throw error;
        }
    }
    async findAll(status, reason, limit, offset) {
        try {
            return await this.reportsService.findAllReports(status, reason, limit, offset);
        }
        catch (error) {
            this.logger.error('Find all reports failed', error);
            throw error;
        }
    }
    async exportExcel(res) {
        try {
            return await this.reportsService.exportReportsToExcel(res);
        }
        catch (error) {
            this.logger.error('Export Excel failed', error);
            throw error;
        }
    }
    async exportPdf(res) {
        try {
            return await this.reportsService.exportReportsToPdf(res);
        }
        catch (error) {
            this.logger.error('Export PDF failed', error);
            throw error;
        }
    }
    async getStats() {
        try {
            return await this.reportsService.getStats();
        }
        catch (error) {
            this.logger.error('Get stats failed', error);
            throw error;
        }
    }
    async findByUser(userId) {
        try {
            return await this.reportsService.findByUser(userId);
        }
        catch (error) {
            this.logger.error('Find by user failed', error);
            throw error;
        }
    }
    async findOne(id) {
        try {
            return await this.reportsService.findOne(id);
        }
        catch (error) {
            this.logger.error('Find one report failed', error);
            throw error;
        }
    }
    async update(id, dto, user) {
        try {
            this.logger.log(`Update report ${id} by admin ${user.id}`);
            return await this.reportsService.update(id, dto, user.id, user.role);
        }
        catch (error) {
            this.logger.error('Update report failed', error);
            throw error;
        }
    }
    async remove(id, user) {
        try {
            this.logger.log(`Delete report ${id} by admin ${user.id}`);
            return await this.reportsService.remove(id, user.role);
        }
        catch (error) {
            this.logger.error('Remove report failed', error);
            throw error;
        }
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a new user report' }),
    (0, swagger_1.ApiBody)({ type: create_report_dto_1.CreateReportDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Report created successfully' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_report_dto_1.CreateReportDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "createReport", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all reports (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: create_report_dto_1.ReportStatus }),
    (0, swagger_1.ApiQuery)({ name: 'reason', required: false, enum: create_report_dto_1.ReportReason }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of reports' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('reason')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export/excel'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export all reports to Excel (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Excel file' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportExcel", null);
__decorate([
    (0, common_1.Get)('export/pdf'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export all reports to PDF (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF file' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportPdf", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get report statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report statistics' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get reports for a specific user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of reports for user' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get report by ID (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report details' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update report status (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiBody)({ type: create_report_dto_1.UpdateReportDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated report' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_report_dto_1.UpdateReportDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a report (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report deleted' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "remove", null);
exports.ReportsController = ReportsController = ReportsController_1 = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map