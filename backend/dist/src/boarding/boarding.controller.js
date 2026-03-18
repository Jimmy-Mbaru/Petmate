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
var BoardingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const boarding_service_1 = require("./boarding.service");
const create_boarding_profile_dto_1 = require("./dto/create-boarding-profile.dto");
const update_boarding_profile_dto_1 = require("./dto/update-boarding-profile.dto");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const update_booking_status_dto_1 = require("./dto/update-booking-status.dto");
const create_review_dto_1 = require("./dto/create-review.dto");
const blackout_date_dto_1 = require("./dto/blackout-date.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const search_boarding_query_dto_1 = require("./dto/search-boarding-query.dto");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let BoardingController = BoardingController_1 = class BoardingController {
    boardingService;
    logger = new common_1.Logger(BoardingController_1.name);
    constructor(boardingService) {
        this.boardingService = boardingService;
    }
    async getMyProfile(user) {
        try {
            this.logger.debug(`Get my profile requested by host ${user.id}`);
            return await this.boardingService.getMyProfile(user.id);
        }
        catch (error) {
            this.logger.error(`Get my profile failed for host ${user.id}`, error?.stack);
            throw error;
        }
    }
    async getProfileByHost(hostId, user) {
        try {
            this.logger.debug(`Get boarding profile by host ID requested: ${hostId} by user ${user.id}`);
            return await this.boardingService.getProfileByHost(hostId, user.id, user.role);
        }
        catch (error) {
            this.logger.error(`Get boarding profile by host ID failed for host: ${hostId}`, error?.stack);
            throw error;
        }
    }
    async createProfile(dto, user) {
        try {
            this.logger.log(`Create boarding profile requested by host ${user.id}`);
            const result = await this.boardingService.createProfile(user.id, dto);
            this.logger.log(`Boarding profile created: id=${result.id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Create boarding profile failed for host ${user.id}`, error?.stack);
            throw error;
        }
    }
    async search(query) {
        try {
            const q = query?.q ?? query?.location;
            this.logger.debug(`Search boarding requested, q=${q}, minPrice=${query?.minPrice}, minRating=${query?.minRating}`);
            return await this.boardingService.search({
                q,
                minPrice: query?.minPrice,
                maxPrice: query?.maxPrice,
                minCapacity: query?.minCapacity,
                minRating: query?.minRating,
                lat: query?.lat,
                lng: query?.lng,
                maxDistanceKm: query?.maxDistanceKm,
                startDate: query?.startDate,
                endDate: query?.endDate,
            }, query?.limit, query?.offset);
        }
        catch (error) {
            this.logger.error('Search boarding failed', error?.stack);
            throw error;
        }
    }
    async myBookings(user, pagination) {
        try {
            this.logger.debug(`My bookings requested by user ${user.id}`);
            return await this.boardingService.myBookings(user.id, user.role, pagination?.limit, pagination?.offset);
        }
        catch (error) {
            this.logger.error(`My bookings failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async updateBookingStatus(id, dto, user) {
        try {
            if (dto.status !== client_2.BookingStatus.ACCEPTED &&
                dto.status !== client_2.BookingStatus.DECLINED) {
                dto.status = client_2.BookingStatus.DECLINED;
            }
            this.logger.log(`Update booking status requested: ${id} to ${dto.status} by host ${user.id}`);
            return await this.boardingService.updateBookingStatus(id, user.id, dto.status);
        }
        catch (error) {
            this.logger.error(`Update booking status failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async createReview(id, dto, user) {
        try {
            this.logger.log(`Create review requested for booking ${id} by user ${user.id}`);
            return await this.boardingService.createReview(id, user.id, dto);
        }
        catch (error) {
            this.logger.error(`Create review failed for booking ${id}`, error?.stack);
            throw error;
        }
    }
    async findOneProfile(id) {
        try {
            this.logger.debug(`FindOne boarding profile requested: ${id}`);
            return await this.boardingService.findOneProfile(id);
        }
        catch (error) {
            this.logger.error(`FindOne boarding profile failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async approveProfile(id, isApproved, user) {
        try {
            this.logger.log(`Approve/Reject boarding profile requested: ${id} by admin ${user.id} (approve: ${isApproved})`);
            return await this.boardingService.approveProfile(id, user.id, isApproved !== false);
        }
        catch (error) {
            this.logger.error(`Approve/Reject profile failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async updateProfile(id, dto, user) {
        try {
            this.logger.log(`Update boarding profile requested: ${id} by user ${user.id}`);
            return await this.boardingService.updateProfile(id, user.id, dto);
        }
        catch (error) {
            this.logger.error(`Update boarding profile failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async getBlackoutDates(id, user, startDate, endDate) {
        return await this.boardingService.getBlackoutDates(id, user.id, startDate, endDate);
    }
    async addBlackout(id, dto, user) {
        return await this.boardingService.addBlackout(id, user.id, dto.date);
    }
    async removeBlackout(id, date, user) {
        return await this.boardingService.removeBlackout(id, user.id, date);
    }
    async book(id, dto, user) {
        try {
            this.logger.log(`Book boarding requested: profile ${id} by user ${user.id}`);
            const result = await this.boardingService.book(id, user.id, dto);
            this.logger.log(`Booking created: id=${result.id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Book boarding failed for profile ${id}`, error?.stack);
            throw error;
        }
    }
};
exports.BoardingController = BoardingController;
__decorate([
    (0, common_1.Get)('my-profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.HOST),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current host\'s boarding profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current host\'s boarding profile with stats' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile not found' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('profile/host/:hostId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get boarding profile by host ID' }),
    (0, swagger_1.ApiParam)({ name: 'hostId', type: String, description: 'Host user ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Boarding profile for the specified host' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile not found' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('hostId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "getProfileByHost", null);
__decorate([
    (0, common_1.Post)('profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.HOST),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Host creates boarding profile' }),
    (0, swagger_1.ApiBody)({ type: create_boarding_profile_dto_1.CreateBoardingProfileDto }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_boarding_profile_dto_1.CreateBoardingProfileDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "createProfile", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Search & discover boarding services (paginated)',
        description: 'Full-text search on location/description; filters: price range, capacity, min rating; distance params reserved for future coordinates.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'q',
        required: false,
        description: 'Full-text search on location and description (also accepts legacy "location" param)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'location',
        required: false,
        description: 'Legacy: same as q (filter by location/description)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false, type: Number, description: 'Minimum price per day' }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price per day' }),
    (0, swagger_1.ApiQuery)({ name: 'minCapacity', required: false, type: Number, description: 'Minimum capacity' }),
    (0, swagger_1.ApiQuery)({ name: 'minRating', required: false, type: Number, description: 'Minimum average rating (1–5)' }),
    (0, swagger_1.ApiQuery)({ name: 'lat', required: false, type: Number, description: 'Reserved: latitude for distance filter' }),
    (0, swagger_1.ApiQuery)({ name: 'lng', required: false, type: Number, description: 'Reserved: longitude for distance filter' }),
    (0, swagger_1.ApiQuery)({ name: 'maxDistanceKm', required: false, type: Number, description: 'Reserved: max distance in km' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'Filter profiles with availability from this date (ISO)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'Filter profiles with availability until this date (ISO)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of approved boarding profiles (data, total, limit, offset)',
    }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_boarding_query_dto_1.SearchBoardingQueryDto]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('bookings/my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'My bookings (owner or host), paginated' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of my bookings (data, total, limit, offset)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "myBookings", null);
__decorate([
    (0, common_1.Patch)('bookings/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.HOST),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Host accept/decline booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Booking ID' }),
    (0, swagger_1.ApiBody)({ type: update_booking_status_dto_1.UpdateBookingStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking status updated' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_status_dto_1.UpdateBookingStatusDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "updateBookingStatus", null);
__decorate([
    (0, common_1.Post)('bookings/:id/review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.OWNER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Owner leaves review after completed booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Booking ID' }),
    (0, swagger_1.ApiBody)({ type: create_review_dto_1.CreateReviewDto }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_dto_1.CreateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "createReview", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Boarding profile detail' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Boarding profile with reviews' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "findOneProfile", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin approves or rejects host profile' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { isApproved: { type: 'boolean' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile approved or rejected' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isApproved')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "approveProfile", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Host updates own profile' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiBody)({ type: update_boarding_profile_dto_1.UpdateBoardingProfileDto }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_boarding_profile_dto_1.UpdateBoardingProfileDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)(':id/blackout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List blackout dates for host profile (optional date range)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'Filter from date (ISO)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'Filter to date (ISO)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "getBlackoutDates", null);
__decorate([
    (0, common_1.Post)(':id/blackout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.HOST),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a blackout date' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiBody)({ type: blackout_date_dto_1.AddBlackoutDateDto }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, blackout_date_dto_1.AddBlackoutDateDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "addBlackout", null);
__decorate([
    (0, common_1.Delete)(':id/blackout/:date'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.HOST),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a blackout date' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiParam)({ name: 'date', description: 'Date (YYYY-MM-DD)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('date')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "removeBlackout", null);
__decorate([
    (0, common_1.Post)(':id/book'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.OWNER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Owner books a slot' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Boarding profile ID' }),
    (0, swagger_1.ApiBody)({
        type: create_booking_dto_1.CreateBookingDto,
        description: 'Start and end dates (ISO 8601)',
    }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_dto_1.CreateBookingDto, Object]),
    __metadata("design:returntype", Promise)
], BoardingController.prototype, "book", null);
exports.BoardingController = BoardingController = BoardingController_1 = __decorate([
    (0, swagger_1.ApiTags)('boarding'),
    (0, common_1.Controller)('boarding'),
    __metadata("design:paramtypes", [boarding_service_1.BoardingService])
], BoardingController);
//# sourceMappingURL=boarding.controller.js.map