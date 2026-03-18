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
var AdminReportsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const block_report_service_1 = require("./block-report.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const resolve_report_dto_1 = require("./dto/resolve-report.dto");
const list_reports_query_dto_1 = require("./dto/list-reports-query.dto");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let AdminReportsController = AdminReportsController_1 = class AdminReportsController {
    blockReportService;
    logger = new common_1.Logger(AdminReportsController_1.name);
    constructor(blockReportService) {
        this.blockReportService = blockReportService;
    }
    async listReports(query) {
        const statusFilter = query?.status === 'REVIEWED' ? client_1.ReportStatus.RESOLVED : query?.status;
        return await this.blockReportService.listReports(query?.limit, query?.offset, statusFilter);
    }
    async resolveReport(id, dto) {
        return await this.blockReportService.resolveReport(id, dto.status, dto.adminNotes);
    }
};
exports.AdminReportsController = AdminReportsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List user reports (admin queue), paginated' }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: ['PENDING', 'REVIEWED', 'DISMISSED'],
        description: 'Filter by report status',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of reports (data, total, limit, offset)',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_reports_query_dto_1.ListReportsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "listReports", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve or dismiss a report (admin)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Report ID' }),
    (0, swagger_1.ApiBody)({ type: resolve_report_dto_1.ResolveReportDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report updated' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, resolve_report_dto_1.ResolveReportDto]),
    __metadata("design:returntype", Promise)
], AdminReportsController.prototype, "resolveReport", null);
exports.AdminReportsController = AdminReportsController = AdminReportsController_1 = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [block_report_service_1.BlockReportService])
], AdminReportsController);
//# sourceMappingURL=admin-reports.controller.js.map