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
var BlockReportController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockReportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const block_report_service_1 = require("./block-report.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const report_user_dto_1 = require("./dto/report-user.dto");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let BlockReportController = BlockReportController_1 = class BlockReportController {
    blockReportService;
    logger = new common_1.Logger(BlockReportController_1.name);
    constructor(blockReportService) {
        this.blockReportService = blockReportService;
    }
    async block(userId, user) {
        return await this.blockReportService.block(user.id, userId);
    }
    async unblock(userId, user) {
        return await this.blockReportService.unblock(user.id, userId);
    }
    async listBlocked(user) {
        return await this.blockReportService.listBlocked(user.id);
    }
    async report(userId, dto, user) {
        return await this.blockReportService.report(user.id, userId, dto.reason);
    }
};
exports.BlockReportController = BlockReportController;
__decorate([
    (0, common_1.Post)('block/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Block a user (hides their messages and bookings from you)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', type: String, description: 'User ID (UUID) to block' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User blocked' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlockReportController.prototype, "block", null);
__decorate([
    (0, common_1.Delete)('block/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Unblock a user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', type: String, description: 'User ID (UUID) to unblock' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User unblocked' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlockReportController.prototype, "unblock", null);
__decorate([
    (0, common_1.Get)('blocked'),
    (0, swagger_1.ApiOperation)({ summary: 'List users I have blocked' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Array of { userId, name }' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlockReportController.prototype, "listBlocked", null);
__decorate([
    (0, common_1.Post)('report/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Report a user (adds to admin queue)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', type: String, description: 'User ID (UUID) to report' }),
    (0, swagger_1.ApiBody)({ type: report_user_dto_1.ReportUserDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Report created' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, report_user_dto_1.ReportUserDto, Object]),
    __metadata("design:returntype", Promise)
], BlockReportController.prototype, "report", null);
exports.BlockReportController = BlockReportController = BlockReportController_1 = __decorate([
    (0, swagger_1.ApiTags)('block-report'),
    (0, common_1.Controller)('block-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [block_report_service_1.BlockReportService])
], BlockReportController);
//# sourceMappingURL=block-report.controller.js.map