"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const pets_module_1 = require("./pets/pets.module");
const boarding_module_1 = require("./boarding/boarding.module");
const store_module_1 = require("./store/store.module");
const chat_module_1 = require("./chat/chat.module");
const admin_module_1 = require("./admin/admin.module");
const cloudinary_module_1 = require("./cloudinary/cloudinary.module");
const favorites_module_1 = require("./favorites/favorites.module");
const block_report_module_1 = require("./block-report/block-report.module");
const email_module_1 = require("./email/email.module");
const reports_module_1 = require("./reports/reports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot(process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID != null
                ? [
                    { name: 'default', ttl: 60_000, limit: 10_000 },
                    { name: 'auth', ttl: 60_000, limit: 10_000 },
                ]
                : [
                    { name: 'default', ttl: 60_000, limit: 200 },
                    { name: 'auth', ttl: 60_000, limit: 30 },
                ]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            pets_module_1.PetsModule,
            boarding_module_1.BoardingModule,
            store_module_1.StoreModule,
            chat_module_1.ChatModule,
            admin_module_1.AdminModule,
            favorites_module_1.FavoritesModule,
            block_report_module_1.BlockReportModule,
            cloudinary_module_1.CloudinaryModule,
            email_module_1.EmailModule,
            reports_module_1.ReportsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map