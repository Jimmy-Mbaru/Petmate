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
var BoardingJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardingJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let BoardingJobsService = BoardingJobsService_1 = class BoardingJobsService {
    prisma;
    logger = new common_1.Logger(BoardingJobsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async autoCompleteEndedBookings() {
        const now = new Date();
        const result = await this.prisma.booking.updateMany({
            where: {
                status: client_1.BookingStatus.ACCEPTED,
                endDate: { lt: now },
            },
            data: { status: client_1.BookingStatus.COMPLETED },
        });
        if (result.count > 0) {
            this.logger.log(`Auto-completed ${result.count} bookings that have ended.`);
        }
    }
    async sendUpcomingBookingReminders() {
        const now = new Date();
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(now.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setDate(tomorrowStart.getDate() + 1);
        const bookings = await this.prisma.booking.findMany({
            where: {
                status: client_1.BookingStatus.ACCEPTED,
                startDate: {
                    gte: tomorrowStart,
                    lt: dayAfterStart,
                },
            },
            include: {
                owner: { select: { id: true, email: true, name: true } },
                boardingProfile: {
                    include: {
                        host: { select: { id: true, email: true, name: true } },
                    },
                },
            },
        });
        if (!bookings.length) {
            this.logger.debug('No upcoming bookings for reminder window.');
            return;
        }
        for (const booking of bookings) {
            this.logger.log(`Would send reminder for booking #${booking.id} to owner ${booking.owner.email} and host ${booking.boardingProfile.host.email}`);
        }
    }
};
exports.BoardingJobsService = BoardingJobsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoardingJobsService.prototype, "autoCompleteEndedBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoardingJobsService.prototype, "sendUpcomingBookingReminders", null);
exports.BoardingJobsService = BoardingJobsService = BoardingJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BoardingJobsService);
//# sourceMappingURL=boarding-jobs.service.js.map