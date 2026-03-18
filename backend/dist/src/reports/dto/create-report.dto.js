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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateReportDto = exports.CreateReportDto = exports.ReportStatus = exports.ReportReason = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ReportReason;
(function (ReportReason) {
    ReportReason["SPAM"] = "spam";
    ReportReason["HARASSMENT"] = "harassment";
    ReportReason["FAKE_PROFILE"] = "fake_profile";
    ReportReason["INAPPROPRIATE_CONTENT"] = "inappropriate_content";
    ReportReason["SCAM"] = "scam";
    ReportReason["UNDERAGE"] = "underage";
    ReportReason["OTHER"] = "other";
})(ReportReason || (exports.ReportReason = ReportReason = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["UNDER_REVIEW"] = "under_review";
    ReportStatus["RESOLVED"] = "resolved";
    ReportStatus["DISMISSED"] = "dismissed";
    ReportStatus["ACTION_TAKEN"] = "action_taken";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
class CreateReportDto {
    reportedUserId;
    reason;
    description;
}
exports.CreateReportDto = CreateReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the user being reported' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "reportedUserId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ReportReason, description: 'Reason for reporting' }),
    (0, class_validator_1.IsEnum)(ReportReason),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Detailed description of the issue', minLength: 20, maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateReportDto.prototype, "description", void 0);
class UpdateReportDto {
    status;
    adminNotes;
}
exports.UpdateReportDto = UpdateReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ReportStatus, required: false, description: 'New status for the report' }),
    (0, class_validator_1.IsEnum)(ReportStatus),
    __metadata("design:type", String)
], UpdateReportDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Admin notes about the report' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateReportDto.prototype, "adminNotes", void 0);
//# sourceMappingURL=create-report.dto.js.map