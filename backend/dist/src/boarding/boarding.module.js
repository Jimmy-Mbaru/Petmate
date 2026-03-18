"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardingModule = void 0;
const common_1 = require("@nestjs/common");
const boarding_controller_1 = require("./boarding.controller");
const boarding_service_1 = require("./boarding.service");
const boarding_jobs_service_1 = require("./boarding-jobs.service");
const block_report_module_1 = require("../block-report/block-report.module");
const email_module_1 = require("../email/email.module");
let BoardingModule = class BoardingModule {
};
exports.BoardingModule = BoardingModule;
exports.BoardingModule = BoardingModule = __decorate([
    (0, common_1.Module)({
        imports: [block_report_module_1.BlockReportModule, email_module_1.EmailModule],
        controllers: [boarding_controller_1.BoardingController],
        providers: [boarding_service_1.BoardingService, boarding_jobs_service_1.BoardingJobsService],
        exports: [boarding_service_1.BoardingService],
    })
], BoardingModule);
//# sourceMappingURL=boarding.module.js.map