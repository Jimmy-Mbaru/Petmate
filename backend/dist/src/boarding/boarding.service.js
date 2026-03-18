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
var BoardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const block_report_service_1 = require("../block-report/block-report.service");
const client_1 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const EARTH_RADIUS_KM = 6371;
function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}
const email_service_1 = require("../email/email.service");
let BoardingService = BoardingService_1 = class BoardingService {
    prisma;
    blockReport;
    emailService;
    logger = new common_1.Logger(BoardingService_1.name);
    constructor(prisma, blockReport, emailService) {
        this.prisma = prisma;
        this.blockReport = blockReport;
        this.emailService = emailService;
    }
    get blackout() {
        return this.prisma
            .blackoutDate;
    }
    async createProfile(hostId, dto) {
        try {
            const existing = await this.prisma.boardingProfile.findUnique({
                where: { hostId },
            });
            if (existing)
                throw new common_1.BadRequestException('You already have a boarding profile');
            const createData = {
                hostId,
                location: dto.location,
                latitude: dto.latitude ?? undefined,
                longitude: dto.longitude ?? undefined,
                capacity: dto.capacity,
                pricePerDay: dto.pricePerDay,
                description: dto.description ?? undefined,
                photoUrls: dto.photoUrls ?? [],
                documentUrls: dto.documentUrls ?? [],
                ...(dto.maxPetsPerNight != null && {
                    maxPetsPerNight: dto.maxPetsPerNight,
                }),
            };
            return this.prisma.boardingProfile.create({
                data: createData,
            });
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Create boarding profile failed', error);
            throw error;
        }
    }
    async search(filters = {}, limit, offset) {
        try {
            const where = {
                isApproved: true,
            };
            if (filters.q?.trim()) {
                const term = filters.q.trim();
                where.OR = [
                    { location: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } },
                ];
            }
            if (filters.minPrice != null || filters.maxPrice != null) {
                where.pricePerDay = {};
                if (filters.minPrice != null)
                    where.pricePerDay.gte = filters.minPrice;
                if (filters.maxPrice != null)
                    where.pricePerDay.lte = filters.maxPrice;
            }
            if (filters.minCapacity != null)
                where.capacity = { gte: filters.minCapacity };
            if (filters.minRating != null) {
                const groups = await this.prisma.review.groupBy({
                    by: ['boardingProfileId'],
                    _avg: { rating: true },
                    having: {
                        rating: { _avg: { gte: filters.minRating } },
                    },
                });
                const profileIds = groups.map((g) => g.boardingProfileId);
                if (profileIds.length === 0) {
                    const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
                    return { data: [], total: 0, limit: take, offset: skip };
                }
                where.id = { in: profileIds };
            }
            const hasDateFilter = filters.startDate != null &&
                filters.endDate != null &&
                filters.startDate.trim() !== '' &&
                filters.endDate.trim() !== '';
            if (hasDateFilter) {
                const startDay = new Date(filters.startDate);
                startDay.setUTCHours(0, 0, 0, 0);
                const endDay = new Date(filters.endDate);
                endDay.setUTCHours(23, 59, 59, 999);
                const profilesWithBlackout = await this.blackout.findMany({
                    where: { date: { gte: startDay, lte: endDay } },
                    select: { boardingProfileId: true },
                    distinct: ['boardingProfileId'],
                });
                const ids = profilesWithBlackout.map((b) => b.boardingProfileId);
                const blackoutProfileIds = new Set(ids);
                if (blackoutProfileIds.size > 0) {
                    const existingIdFilter = where.id;
                    if (existingIdFilter && Array.isArray(existingIdFilter.in)) {
                        where.id = {
                            in: existingIdFilter.in.filter((id) => !blackoutProfileIds.has(id)),
                        };
                    }
                    else {
                        where.id = { notIn: [...blackoutProfileIds] };
                    }
                }
            }
            const useDistanceFilter = filters.lat != null &&
                filters.lng != null &&
                filters.maxDistanceKm != null &&
                filters.maxDistanceKm > 0;
            if (useDistanceFilter) {
                where.latitude = { not: null };
                where.longitude = { not: null };
            }
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            if (useDistanceFilter) {
                const maxCandidates = 5000;
                const candidates = await this.prisma.boardingProfile.findMany({
                    where,
                    include: { host: { select: { id: true, name: true } } },
                    orderBy: { id: 'desc' },
                    take: maxCandidates,
                });
                const lat = filters.lat;
                const lng = filters.lng;
                const maxKm = filters.maxDistanceKm;
                const withDistance = candidates
                    .filter((p) => {
                    const km = haversineKm(lat, lng, p.latitude, p.longitude);
                    return km <= maxKm;
                })
                    .map((p) => ({
                    ...p,
                    distanceKm: haversineKm(lat, lng, p.latitude, p.longitude),
                }));
                const total = withDistance.length;
                const data = withDistance.slice(skip, skip + take);
                return { data, total, limit: take, offset: skip };
            }
            const [data, total] = await Promise.all([
                this.prisma.boardingProfile.findMany({
                    where,
                    include: { host: { select: { id: true, name: true } } },
                    orderBy: { id: 'desc' },
                    take,
                    skip,
                }),
                this.prisma.boardingProfile.count({ where }),
            ]);
            return { data, total, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('Search boarding failed', error);
            throw error;
        }
    }
    async getProfileByHost(hostId, currentUserId, currentUserRole) {
        try {
            if (currentUserId !== hostId && currentUserRole !== client_1.Role.ADMIN) {
                throw new common_1.ForbiddenException('You can only view your own boarding profile');
            }
            const profile = await this.prisma.boardingProfile.findUnique({
                where: { hostId },
            });
            return profile;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException ||
                error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Get boarding profile by host ID failed', error);
            throw error;
        }
    }
    async getMyProfile(hostId) {
        try {
            const profileWithRelations = await this.prisma.boardingProfile.findUnique({
                where: { hostId },
                include: {
                    reviews: {
                        select: { rating: true },
                    },
                    bookings: {
                        select: {
                            id: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            boardingProfile: {
                                select: {
                                    pricePerDay: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!profileWithRelations) {
                throw new common_1.NotFoundException('Boarding profile not found');
            }
            const profile = profileWithRelations;
            const averageRating = profile.reviews.length > 0
                ? profile.reviews.reduce((sum, r) => sum + r.rating, 0) / profile.reviews.length
                : 0;
            const getBookingTotal = (b) => {
                const days = Math.ceil((b.endDate.getTime() - b.startDate.getTime()) / (1000 * 60 * 60 * 24));
                return days * b.boardingProfile.pricePerDay;
            };
            const totalEarnings = profile.bookings
                .filter((b) => b.status === 'COMPLETED' || b.status === 'ACCEPTED')
                .reduce((sum, b) => sum + getBookingTotal(b), 0);
            const totalBookings = profile.bookings.length;
            const pendingBookings = profile.bookings.filter((b) => b.status === 'PENDING').length;
            const completedBookings = profile.bookings.filter((b) => b.status === 'COMPLETED').length;
            const reviewCount = profile.reviews.length;
            return {
                id: profile.id,
                hostId: profile.hostId,
                location: profile.location,
                capacity: profile.capacity,
                pricePerDay: profile.pricePerDay,
                description: profile.description,
                isApproved: profile.isApproved,
                documentUrls: profile.documentUrls,
                latitude: profile.latitude,
                longitude: profile.longitude,
                photoUrls: profile.photoUrls,
                maxPetsPerNight: profile.maxPetsPerNight,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt,
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount,
                stats: {
                    totalEarnings,
                    totalBookings,
                    pendingBookings,
                    completedBookings,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Get my profile failed', error);
            throw error;
        }
    }
    async findOneProfile(id) {
        try {
            const profile = await this.prisma.boardingProfile.findUnique({
                where: { id },
                include: {
                    host: { select: { id: true, name: true } },
                    reviews: {
                        include: { booking: { select: { ownerId: true } } },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
            if (!profile)
                throw new common_1.NotFoundException('Boarding profile not found');
            return profile;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('FindOne boarding profile failed', error);
            throw error;
        }
    }
    async updateProfile(id, hostId, dto) {
        try {
            const profile = await this.prisma.boardingProfile.findUnique({
                where: { id },
            });
            if (!profile)
                throw new common_1.NotFoundException('Profile not found');
            if (profile.hostId !== hostId)
                throw new common_1.ForbiddenException('Not your profile');
            return this.prisma.boardingProfile.update({
                where: { id },
                data: dto,
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('Update boarding profile failed', error);
            throw error;
        }
    }
    async book(boardingProfileId, ownerId, dto) {
        try {
            const profile = await this.prisma.boardingProfile.findUnique({
                where: { id: boardingProfileId },
                include: { host: { select: { id: true } } },
            });
            if (!profile)
                throw new common_1.NotFoundException('Boarding profile not found');
            if (!profile.isApproved)
                throw new common_1.BadRequestException('Profile not approved yet');
            const hostBlockedOwner = await this.blockReport.isBlocked(profile.host.id, ownerId);
            const ownerBlockedHost = await this.blockReport.isBlocked(ownerId, profile.host.id);
            if (hostBlockedOwner || ownerBlockedHost)
                throw new common_1.BadRequestException('Booking not available (blocked user).');
            const start = new Date(dto.startDate);
            const end = new Date(dto.endDate);
            if (end <= start)
                throw new common_1.BadRequestException('End date must be after start date');
            const startDay = new Date(start);
            startDay.setUTCHours(0, 0, 0, 0);
            const endDay = new Date(end);
            endDay.setUTCHours(0, 0, 0, 0);
            const blackoutInRange = await this.blackout.findFirst({
                where: {
                    boardingProfileId,
                    date: { gte: startDay, lt: endDay },
                },
            });
            if (blackoutInRange) {
                throw new common_1.BadRequestException('Selected dates include a blackout date for this host; please choose different dates.');
            }
            const profileWithCapacity = profile;
            const maxPerNight = profileWithCapacity.maxPetsPerNight ?? 1;
            const overlapping = await this.prisma.booking.findMany({
                where: {
                    boardingProfileId,
                    status: { in: [client_1.BookingStatus.PENDING, client_1.BookingStatus.ACCEPTED] },
                    startDate: { lt: end },
                    endDate: { gt: start },
                },
            });
            for (let d = new Date(startDay); d < endDay; d.setUTCDate(d.getUTCDate() + 1)) {
                const day = new Date(d);
                day.setUTCHours(0, 0, 0, 0);
                const count = overlapping.filter((b) => day >= new Date(new Date(b.startDate).setUTCHours(0, 0, 0, 0)) &&
                    day < new Date(new Date(b.endDate).setUTCHours(0, 0, 0, 0))).length + 1;
                if (count > maxPerNight) {
                    throw new common_1.BadRequestException(`Selected dates exceed capacity (max ${maxPerNight} pets per night).`);
                }
            }
            const booking = await this.prisma.booking.create({
                data: {
                    ownerId,
                    boardingProfileId,
                    startDate: start,
                    endDate: end,
                    status: client_1.BookingStatus.PENDING,
                },
                include: {
                    boardingProfile: {
                        include: {
                            host: { select: { id: true, email: true, name: true } },
                        },
                    },
                    owner: { select: { id: true, name: true, email: true } },
                },
            });
            this.logger.log(`New booking #${booking.id} created by owner ${booking.owner.email} for host ${booking.boardingProfile.host.email}`);
            await this.emailService.sendBookingUpdate({
                email: booking.owner.email,
                name: booking.owner.name,
                bookingId: booking.id.slice(0, 8).toUpperCase(),
                status: 'PENDING',
                hostName: booking.boardingProfile.host.name,
                startDate: booking.startDate.toLocaleDateString(),
                endDate: booking.endDate.toLocaleDateString(),
            });
            return booking;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Create booking failed', error);
            throw error;
        }
    }
    async updateBookingStatus(bookingId, hostId, status) {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { boardingProfile: true },
            });
            if (!booking)
                throw new common_1.NotFoundException('Booking not found');
            if (booking.boardingProfile.hostId !== hostId)
                throw new common_1.ForbiddenException('Not your boarding profile');
            if (booking.status !== client_1.BookingStatus.PENDING)
                throw new common_1.BadRequestException('Booking already processed');
            if (status !== client_1.BookingStatus.ACCEPTED &&
                status !== client_1.BookingStatus.DECLINED)
                throw new common_1.BadRequestException('Status must be ACCEPTED or DECLINED');
            const updated = await this.prisma.booking.update({
                where: { id: bookingId },
                data: { status },
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    boardingProfile: {
                        include: {
                            host: { select: { id: true, email: true, name: true } },
                        },
                    },
                },
            });
            if (status === client_1.BookingStatus.ACCEPTED) {
                this.logger.log(`Booking #${updated.id} accepted by host ${updated.boardingProfile.host.email} (owner ${updated.owner.email})`);
            }
            else if (status === client_1.BookingStatus.DECLINED) {
                this.logger.log(`Booking #${updated.id} declined by host ${updated.boardingProfile.host.email} (owner ${updated.owner.email})`);
            }
            await this.emailService.sendBookingUpdate({
                email: updated.owner.email,
                name: updated.owner.name,
                bookingId: updated.id.slice(0, 8).toUpperCase(),
                status: updated.status,
                hostName: updated.boardingProfile.host.name,
                startDate: updated.startDate.toLocaleDateString(),
                endDate: updated.endDate.toLocaleDateString(),
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException ||
                error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Update booking status failed', error);
            throw error;
        }
    }
    async myBookings(userId, role, limit, offset) {
        try {
            const blockedIds = await this.blockReport.getBlockedUserIds(userId);
            const blockedArr = blockedIds.size ? Array.from(blockedIds) : [];
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            if (role === client_1.Role.OWNER) {
                const where = {
                    ownerId: userId,
                    ...(blockedArr.length > 0
                        ? { boardingProfile: { hostId: { notIn: blockedArr } } }
                        : {}),
                };
                const [data, total] = await Promise.all([
                    this.prisma.booking.findMany({
                        where,
                        include: {
                            boardingProfile: {
                                include: { host: { select: { id: true, name: true } } },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        take,
                        skip,
                    }),
                    this.prisma.booking.count({ where }),
                ]);
                const withTotalPrice = data.map((b) => {
                    const start = new Date(b.startDate);
                    const end = new Date(b.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const totalPrice = Math.max(1, days) * b.boardingProfile.pricePerDay;
                    return { ...b, totalPrice };
                });
                return { data: withTotalPrice, total, limit: take, offset: skip };
            }
            if (role === client_1.Role.HOST) {
                const profile = await this.prisma.boardingProfile.findUnique({
                    where: { hostId: userId },
                });
                if (!profile)
                    return { data: [], total: 0, limit: take, offset: skip };
                const where = {
                    boardingProfileId: profile.id,
                    ...(blockedArr.length > 0 ? { ownerId: { notIn: blockedArr } } : {}),
                };
                const [data, total] = await Promise.all([
                    this.prisma.booking.findMany({
                        where,
                        include: {
                            owner: { select: { id: true, name: true } },
                            boardingProfile: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take,
                        skip,
                    }),
                    this.prisma.booking.count({ where }),
                ]);
                const withTotalPrice = data.map((b) => {
                    const start = new Date(b.startDate);
                    const end = new Date(b.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const totalPrice = Math.max(1, days) * b.boardingProfile.pricePerDay;
                    return { ...b, totalPrice };
                });
                return { data: withTotalPrice, total, limit: take, offset: skip };
            }
            return { data: [], total: 0, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('My bookings failed', error);
            throw error;
        }
    }
    async createReview(bookingId, ownerId, dto) {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { review: true },
            });
            if (!booking)
                throw new common_1.NotFoundException('Booking not found');
            if (booking.ownerId !== ownerId)
                throw new common_1.ForbiddenException('Not your booking');
            if (booking.status !== client_1.BookingStatus.COMPLETED)
                throw new common_1.BadRequestException('Can only review completed bookings');
            if (booking.review)
                throw new common_1.BadRequestException('Already reviewed');
            return this.prisma.review.create({
                data: {
                    bookingId,
                    boardingProfileId: booking.boardingProfileId,
                    rating: dto.rating,
                    comment: dto.comment,
                },
                include: { booking: true, boardingProfile: true },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException ||
                error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Create review failed', error);
            throw error;
        }
    }
    async addBlackout(boardingProfileId, hostId, date) {
        const profile = await this.prisma.boardingProfile.findUnique({
            where: { id: boardingProfileId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        if (profile.hostId !== hostId)
            throw new common_1.ForbiddenException('Not your boarding profile');
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        const existing = await this.blackout.findFirst({
            where: {
                boardingProfileId,
                date: { gte: d, lt: new Date(d.getTime() + 86400000) },
            },
        });
        if (existing) {
            return existing;
        }
        return this.prisma.blackoutDate.create({
            data: { boardingProfileId, date: d },
        });
    }
    async removeBlackout(boardingProfileId, hostId, date) {
        const profile = await this.prisma.boardingProfile.findUnique({
            where: { id: boardingProfileId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        if (profile.hostId !== hostId)
            throw new common_1.ForbiddenException('Not your boarding profile');
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        await this.prisma.blackoutDate.deleteMany({
            where: { boardingProfileId, date: d },
        });
        return { success: true };
    }
    async getBlackoutDates(boardingProfileId, hostId, startDate, endDate) {
        const profile = await this.prisma.boardingProfile.findUnique({
            where: { id: boardingProfileId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        const where = { boardingProfileId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0));
            if (endDate)
                where.date.lte = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));
        }
        return this.blackout.findMany({
            where,
            orderBy: { date: 'asc' },
        });
    }
    async approveProfile(id, _adminId, isApproved = true) {
        try {
            const profile = await this.prisma.boardingProfile.findUnique({
                where: { id },
            });
            if (!profile)
                throw new common_1.NotFoundException('Profile not found');
            if (!isApproved) {
                await this.prisma.boardingProfile.delete({ where: { id } });
                return { message: 'Profile rejected and deleted' };
            }
            return await this.prisma.boardingProfile.update({
                where: { id },
                data: { isApproved: true },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Approve profile failed', error);
            throw error;
        }
    }
};
exports.BoardingService = BoardingService;
exports.BoardingService = BoardingService = BoardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        block_report_service_1.BlockReportService,
        email_service_1.EmailService])
], BoardingService);
//# sourceMappingURL=boarding.service.js.map