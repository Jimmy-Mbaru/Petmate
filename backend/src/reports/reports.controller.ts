import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto, ReportReason, ReportStatus } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new user report' })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @ApiResponsesProtected()
  async createReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    try {
      this.logger.log(`Create report: user ${user.id} reporting ${dto.reportedUserId}`);
      return await this.reportsService.createReport(user.id, dto);
    } catch (error) {
      this.logger.error('Create report failed', error);
      throw error;
    }
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all reports (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  @ApiQuery({ name: 'reason', required: false, enum: ReportReason })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reports' })
  @ApiResponsesProtected()
  async findAll(
    @Query('status') status?: ReportStatus,
    @Query('reason') reason?: ReportReason,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      return await this.reportsService.findAllReports(status, reason, limit, offset);
    } catch (error) {
      this.logger.error('Find all reports failed', error);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get report by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Report details' })
  @ApiResponsesProtected()
  async findOne(@Param('id') id: string) {
    try {
      return await this.reportsService.findOne(id);
    } catch (error) {
      this.logger.error('Find one report failed', error);
      throw error;
    }
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get reports for a specific user (Admin only)' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'List of reports for user' })
  @ApiResponsesProtected()
  async findByUser(@Param('userId') userId: string) {
    try {
      return await this.reportsService.findByUser(userId);
    } catch (error) {
      this.logger.error('Find by user failed', error);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update report status (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateReportDto })
  @ApiResponse({ status: 200, description: 'Updated report' })
  @ApiResponsesProtected()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Update report ${id} by admin ${user.id}`);
      return await this.reportsService.update(id, dto, user.id, user.role as Role);
    } catch (error) {
      this.logger.error('Update report failed', error);
      throw error;
    }
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get report statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report statistics' })
  @ApiResponsesProtected()
  async getStats() {
    try {
      return await this.reportsService.getStats();
    } catch (error) {
      this.logger.error('Get stats failed', error);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a report (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  @ApiResponsesProtected()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Delete report ${id} by admin ${user.id}`);
      return await this.reportsService.remove(id, user.role as Role);
    } catch (error) {
      this.logger.error('Remove report failed', error);
      throw error;
    }
  }
}
