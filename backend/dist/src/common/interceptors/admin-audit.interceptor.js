"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminAuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let AdminAuditInterceptor = AdminAuditInterceptor_1 = class AdminAuditInterceptor {
    logger = new common_1.Logger(AdminAuditInterceptor_1.name);
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const method = request.method;
        const path = request.url?.split('?')[0] ?? request.path;
        const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
            request.socket?.remoteAddress ??
            'unknown';
        const auditMeta = {
            adminId: user?.id,
            email: user?.email,
            method,
            path,
            ip,
            at: new Date().toISOString(),
        };
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                this.logger.log(`Admin access: ${method} ${path} | adminId=${auditMeta.adminId} ip=${ip}`);
            },
            error: (err) => {
                this.logger.warn(`Admin access (error): ${method} ${path} | adminId=${auditMeta.adminId} ip=${ip} | ${err?.message ?? err}`);
            },
        }));
    }
};
exports.AdminAuditInterceptor = AdminAuditInterceptor;
exports.AdminAuditInterceptor = AdminAuditInterceptor = AdminAuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], AdminAuditInterceptor);
//# sourceMappingURL=admin-audit.interceptor.js.map