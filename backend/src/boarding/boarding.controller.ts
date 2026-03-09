import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { BoardingService } from './boarding.service';
import { CreateBoardingProfileDto } from './dto/create-boarding-profile.dto';
import { UpdateBoardingProfileDto } from './dto/update-boarding-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { AddBlackoutDateDto } from './dto/blackout-date.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { BookingStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SearchBoardingQueryDto } from './dto/search-boarding-query.dto';
import {
  ApiResponsesProtected,
  ApiResponsesCreate,
} from '../common/decorators/api-responses.decorator';

@ApiTags('boarding')
@Controller('boarding')
export class BoardingController {
  private readonly logger = new Logger(BoardingController.name);

  constructor(private readonly boardingService: BoardingService) {}

  @Get('profile/host/:hostId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get boarding profile by host ID' })
  @ApiParam({ name: 'hostId', type: String, description: 'Host user ID' })
  @ApiResponse({ status: 200, description: 'Boarding profile for the specified host' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponsesProtected()
  async getProfileByHost(
    @Param('hostId') hostId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.debug(`Get boarding profile by host ID requested: ${hostId} by user ${user.id}`);
      return await this.boardingService.getProfileByHost(hostId, user.id, user.role as Role);
    } catch (error) {
      this.logger.error(
        `Get boarding profile by host ID failed for host: ${hostId}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host creates boarding profile' })
  @ApiBody({ type: CreateBoardingProfileDto })
  @ApiResponsesCreate()
  async createProfile(
    @Body() dto: CreateBoardingProfileDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Create boarding profile requested by host ${user.id}`);
      const result = await this.boardingService.createProfile(user.id, dto);
      this.logger.log(`Boarding profile created: id=${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Create boarding profile failed for host ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Search & discover boarding services (paginated)',
    description:
      'Full-text search on location/description; filters: price range, capacity, min rating; distance params reserved for future coordinates.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Full-text search on location and description (also accepts legacy "location" param)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Legacy: same as q (filter by location/description)',
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price per day' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price per day' })
  @ApiQuery({ name: 'minCapacity', required: false, type: Number, description: 'Minimum capacity' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum average rating (1–5)' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Reserved: latitude for distance filter' })
  @ApiQuery({ name: 'lng', required: false, type: Number, description: 'Reserved: longitude for distance filter' })
  @ApiQuery({ name: 'maxDistanceKm', required: false, type: Number, description: 'Reserved: max distance in km' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter profiles with availability from this date (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter profiles with availability until this date (ISO)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of approved boarding profiles (data, total, limit, offset)',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async search(@Query() query: SearchBoardingQueryDto) {
    try {
      const q = query?.q ?? query?.location;
      this.logger.debug(
        `Search boarding requested, q=${q}, minPrice=${query?.minPrice}, minRating=${query?.minRating}`,
      );
      return await this.boardingService.search(
        {
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
        },
        query?.limit,
        query?.offset,
      );
    } catch (error) {
      this.logger.error('Search boarding failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get('bookings/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My bookings (owner or host), paginated' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of my bookings (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async myBookings(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination?: PaginationQueryDto,
  ) {
    try {
      this.logger.debug(`My bookings requested by user ${user.id}`);
      return await this.boardingService.myBookings(
        user.id,
        user.role as Role,
        pagination?.limit,
        pagination?.offset,
      );
    } catch (error) {
      this.logger.error(
        `My bookings failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch('bookings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host accept/decline booking' })
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  @ApiResponsesProtected()
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      if (
        dto.status !== BookingStatus.ACCEPTED &&
        dto.status !== BookingStatus.DECLINED
      ) {
        dto.status = BookingStatus.DECLINED;
      }
      this.logger.log(
        `Update booking status requested: ${id} to ${dto.status} by host ${user.id}`,
      );
      return await this.boardingService.updateBookingStatus(
        id,
        user.id,
        dto.status,
      );
    } catch (error) {
      this.logger.error(
        `Update booking status failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('bookings/:id/review')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Owner leaves review after completed booking' })
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponsesCreate()
  async createReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(
        `Create review requested for booking ${id} by user ${user.id}`,
      );
      return await this.boardingService.createReview(id, user.id, dto);
    } catch (error) {
      this.logger.error(
        `Create review failed for booking ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Boarding profile detail' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiResponse({ status: 200, description: 'Boarding profile with reviews' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOneProfile(@Param('id') id: string) {
    try {
      this.logger.debug(`FindOne boarding profile requested: ${id}`);
      return await this.boardingService.findOneProfile(id);
    } catch (error) {
      this.logger.error(
        `FindOne boarding profile failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin approves host profile' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiResponse({ status: 200, description: 'Profile approved' })
  @ApiResponsesProtected()
  async approveProfile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(
        `Approve boarding profile requested: ${id} by admin ${user.id}`,
      );
      return await this.boardingService.approveProfile(id, user.id);
    } catch (error) {
      this.logger.error(
        `Approve profile failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host updates own profile' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiBody({ type: UpdateBoardingProfileDto })
  @ApiResponsesProtected()
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateBoardingProfileDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(
        `Update boarding profile requested: ${id} by user ${user.id}`,
      );
      return await this.boardingService.updateProfile(id, user.id, dto);
    } catch (error) {
      this.logger.error(
        `Update boarding profile failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get(':id/blackout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List blackout dates for host profile (optional date range)' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO)' })
  @ApiResponsesProtected()
  async getBlackoutDates(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.boardingService.getBlackoutDates(
      id,
      user.id,
      startDate,
      endDate,
    );
  }

  @Post(':id/blackout')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a blackout date' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiBody({ type: AddBlackoutDateDto })
  @ApiResponsesCreate()
  async addBlackout(
    @Param('id') id: string,
    @Body() dto: AddBlackoutDateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.boardingService.addBlackout(id, user.id, dto.date);
  }

  @Delete(':id/blackout/:date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a blackout date' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiParam({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  @ApiResponsesProtected()
  async removeBlackout(
    @Param('id') id: string,
    @Param('date') date: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.boardingService.removeBlackout(id, user.id, date);
  }

  @Post(':id/book')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Owner books a slot' })
  @ApiParam({ name: 'id', type: Number, description: 'Boarding profile ID' })
  @ApiBody({
    type: CreateBookingDto,
    description: 'Start and end dates (ISO 8601)',
  })
  @ApiResponsesCreate()
  async book(
    @Param('id') id: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(
        `Book boarding requested: profile ${id} by user ${user.id}`,
      );
      const result = await this.boardingService.book(id, user.id, dto);
      this.logger.log(`Booking created: id=${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Book boarding failed for profile ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
