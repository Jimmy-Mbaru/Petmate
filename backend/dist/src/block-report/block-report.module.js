"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockReportModule = void 0;
const common_1 = require("@nestjs/common");
const block_report_service_1 = require("./block-report.service");
const block_report_controller_1 = require("./block-report.controller");
const admin_reports_controller_1 = require("./admin-reports.controller");
let BlockReportModule = class BlockReportModule {
};
exports.BlockReportModule = BlockReportModule;
exports.BlockReportModule = BlockReportModule = __decorate([
    (0, common_1.Module)({
        controllers: [block_report_controller_1.BlockReportController, admin_reports_controller_1.AdminReportsController],
        providers: [block_report_service_1.BlockReportService],
        exports: [block_report_service_1.BlockReportService],
    })
], BlockReportModule);
//# sourceMappingURL=block-report.module.js.map