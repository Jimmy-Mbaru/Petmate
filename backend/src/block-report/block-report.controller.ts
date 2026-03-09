import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BlockReportService } from './block-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ReportUserDto } from './dto/report-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ReportStatus } from '@prisma/client';

@ApiTags('block-report')
@Controller('block-report')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockReportController {
  private readonly logger = new Logger(BlockReportController.name);

  constructor(private readonly blockReportService: BlockReportService) {}

  @Post('block/:userId')
  @ApiOperation({ summary: 'Block a user (hides their messages and bookings from you)' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (UUID) to block' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  @ApiResponsesProtected()
  async block(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.blockReportService.block(user.id, userId);
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (UUID) to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  @ApiResponsesProtected()
  async unblock(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.blockReportService.unblock(user.id, userId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'List users I have blocked' })
  @ApiResponse({ status: 200, description: 'Array of { userId, name }' })
  @ApiResponsesProtected()
  async listBlocked(@CurrentUser() user: CurrentUserPayload) {
    return await this.blockReportService.listBlocked(user.id);
  }

  @Post('report/:userId')
  @ApiOperation({ summary: 'Report a user (adds to admin queue)' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (UUID) to report' })
  @ApiBody({ type: ReportUserDto })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiResponsesProtected()
  async report(
    @Param('userId') userId: string,
    @Body() dto: ReportUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.blockReportService.report(user.id, userId, dto.reason);
  }
}
