import {
  Controller,
  Get,
  Patch,
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
import { Role, ReportStatus } from '@prisma/client';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

@ApiTags('admin')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminReportsController {
  private readonly logger = new Logger(AdminReportsController.name);

  constructor(private readonly blockReportService: BlockReportService) {}

  @Get()
  @ApiOperation({ summary: 'List user reports (admin queue), paginated' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'REVIEWED', 'DISMISSED'],
    description: 'Filter by report status',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reports (data, total, limit, offset)',
  })
  @ApiResponsesProtected()
  async listReports(@Query() query: ListReportsQueryDto) {
    const statusFilter =
      query?.status === 'REVIEWED' ? ReportStatus.RESOLVED : query?.status;
    return await this.blockReportService.listReports(
      query?.limit,
      query?.offset,
      statusFilter,
    );
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a report (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Report ID' })
  @ApiBody({ type: ResolveReportDto })
  @ApiResponse({ status: 200, description: 'Report updated' })
  @ApiResponsesProtected()
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return await this.blockReportService.resolveReport(
      id,
      dto.status,
      dto.adminNotes,
    );
  }
}
