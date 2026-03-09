import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminAuditInterceptor } from '../common/interceptors/admin-audit.interceptor';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'All users (paginated)' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role (OWNER, HOST, ADMIN)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email (partial match)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of users (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async getUsers(
    @Query() pagination?: PaginationQueryDto,
    @Query('role') role?: string,
    @Query('email') email?: string,
  ) {
    try {
      this.logger.debug('Admin getUsers requested');
      return await this.adminService.getUsers(
        pagination?.limit,
        pagination?.offset,
        role,
        email,
      );
    } catch (error) {
      this.logger.error('Admin getUsers failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get('boarding')
  @ApiOperation({ summary: 'Boarding profiles pending approval (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiQuery({
    name: 'isApproved',
    required: false,
    description: 'Filter by approval status (true/false). Default: false',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of boarding profiles with isApproved=false (data, total, limit, offset)',
  })
  @ApiResponsesProtected()
  async getBoardingPending(
    @Query() pagination?: PaginationQueryDto,
    @Query('isApproved') isApproved?: string,
  ) {
    try {
      this.logger.debug('Admin getBoardingPending requested');
      const parsed =
        typeof isApproved === 'string'
          ? isApproved.toLowerCase() === 'true'
          : undefined;
      return await this.adminService.getBoardingPendingApproval(
        pagination?.limit,
        pagination?.offset,
        parsed,
      );
    } catch (error) {
      this.logger.error(
        'Admin getBoardingPending failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'All orders (paginated)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter orders created from this ISO date (inclusive)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter orders created up to this ISO date (inclusive)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all orders with user and items (data, total, limit, offset)',
  })
  @ApiResponsesProtected()
  async getOrders(
    @Query() pagination?: PaginationQueryDto,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      this.logger.debug('Admin getOrders requested');
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      return await this.adminService.getOrders(
        pagination?.limit,
        pagination?.offset,
        status,
        fromDate,
        toDate,
      );
    } catch (error) {
      this.logger.error('Admin getOrders failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Platform stats (users, bookings, orders, revenue)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Object with totalUsers, totalBookings, totalOrders, totalRevenue',
  })
  @ApiResponsesProtected()
  async getDashboard() {
    try {
      this.logger.debug('Admin getDashboard requested');
      return await this.adminService.getDashboard();
    } catch (error) {
      this.logger.error('Admin getDashboard failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get('analytics/bookings-by-status')
  @ApiOperation({ summary: 'Bookings count by status per month' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year (e.g. 2025)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Filter by month 1–12',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of { month, status, count }',
  })
  @ApiResponsesProtected()
  async getBookingsByStatusPerMonth(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    try {
      this.logger.debug('Admin getBookingsByStatusPerMonth requested');
      const yearNum = year ? parseInt(year, 10) : undefined;
      const monthNum = month ? parseInt(month, 10) : undefined;
      const validMonth =
        monthNum !== undefined &&
        Number.isInteger(monthNum) &&
        monthNum >= 1 &&
        monthNum <= 12
          ? monthNum
          : undefined;
      return await this.adminService.getBookingsByStatusPerMonth(
        Number.isInteger(yearNum) ? yearNum : undefined,
        validMonth,
      );
    } catch (error) {
      this.logger.error(
        'Admin getBookingsByStatusPerMonth failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('analytics/revenue-by-month')
  @ApiOperation({ summary: 'Revenue by month (excludes cancelled orders)' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year (e.g. 2025)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of { month, revenue }',
  })
  @ApiResponsesProtected()
  async getRevenueByMonth(@Query('year') year?: string) {
    try {
      this.logger.debug('Admin getRevenueByMonth requested');
      const yearNum = year ? parseInt(year, 10) : undefined;
      return await this.adminService.getRevenueByMonth(
        Number.isInteger(yearNum) ? yearNum : undefined,
      );
    } catch (error) {
      this.logger.error(
        'Admin getRevenueByMonth failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('analytics/top-products')
  @ApiOperation({ summary: 'Top products by quantity sold (excludes cancelled orders)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items to return (default 10, max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of { productId, name, totalQuantity }',
  })
  @ApiResponsesProtected()
  async getTopProducts(@Query('limit') limit?: string) {
    try {
      this.logger.debug('Admin getTopProducts requested');
      const limitNum = limit ? parseInt(limit, 10) : 10;
      return await this.adminService.getTopProducts(
        Number.isInteger(limitNum) ? limitNum : 10,
      );
    } catch (error) {
      this.logger.error(
        'Admin getTopProducts failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('analytics/top-hosts')
  @ApiOperation({ summary: 'Top hosts by booking count' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items to return (default 10, max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of { hostId, hostName, bookingCount }',
  })
  @ApiResponsesProtected()
  async getTopHosts(@Query('limit') limit?: string) {
    try {
      this.logger.debug('Admin getTopHosts requested');
      const limitNum = limit ? parseInt(limit, 10) : 10;
      return await this.adminService.getTopHosts(
        Number.isInteger(limitNum) ? limitNum : 10,
      );
    } catch (error) {
      this.logger.error(
        'Admin getTopHosts failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account (set isActive=false)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User suspended (isActive=false) and basic profile returned',
  })
  @ApiResponsesProtected()
  async suspendUser(@Param('id') id: string) {
    try {
      this.logger.log(`Admin suspendUser requested for user ${id}`);
      return await this.adminService.suspendUser(id);
    } catch (error) {
      this.logger.error(
        `Admin suspendUser failed for user ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account (set isActive=true)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User activated (isActive=true) and basic profile returned',
  })
  @ApiResponsesProtected()
  async activateUser(@Param('id') id: string) {
    try {
      this.logger.log(`Admin activateUser requested for user ${id}`);
      return await this.adminService.activateUser(id);
    } catch (error) {
      this.logger.error(
        `Admin activateUser failed for user ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Update a user role (e.g. OWNER, HOST, ADMIN)',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({
    status: 200,
    description: 'User role updated and basic profile returned',
  })
  @ApiResponsesProtected()
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    try {
      this.logger.log(
        `Admin updateUserRole requested for user ${id} to role ${dto.role}`,
      );
      return await this.adminService.updateUserRole(id, dto.role);
    } catch (error) {
      this.logger.error(
        `Admin updateUserRole failed for user ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('export/users')
  @ApiOperation({
    summary: 'Export users as CSV or PDF (with filters and date range)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'pdf'],
    description: 'Export format: csv (default) or pdf',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role (OWNER, HOST, ADMIN)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email (partial match)',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'From date (ISO) for createdAt',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'To date (ISO) for createdAt',
  })
  @ApiResponse({
    status: 200,
    description: 'File download (CSV or PDF)',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponsesProtected()
  async exportUsers(
    @Query('format') format?: string,
    @Query('role') role?: string,
    @Query('email') email?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const dateStr = new Date().toISOString().slice(0, 10);
    const isPdf = (format ?? 'csv').toLowerCase() === 'pdf';
    if (isPdf) {
      const buffer = await this.adminService.exportUsersPdf(
        role,
        email,
        fromDate,
        toDate,
      );
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="users-export-${dateStr}.pdf"`,
      });
    }
    const csv = await this.adminService.exportUsersCsv(
      role,
      email,
      fromDate,
      toDate,
    );
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="users-export-${dateStr}.csv"`,
    });
  }

  @Get('export/orders')
  @ApiOperation({
    summary: 'Export orders as CSV or PDF (with filters and date range)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'pdf'],
    description: 'Export format: csv (default) or pdf',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'From date (ISO) for createdAt',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'To date (ISO) for createdAt',
  })
  @ApiResponse({
    status: 200,
    description: 'File download (CSV or PDF)',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponsesProtected()
  async exportOrders(
    @Query('format') format?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const dateStr = new Date().toISOString().slice(0, 10);
    const isPdf = (format ?? 'csv').toLowerCase() === 'pdf';
    if (isPdf) {
      const buffer = await this.adminService.exportOrdersPdf(
        status,
        fromDate,
        toDate,
      );
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="orders-export-${dateStr}.pdf"`,
      });
    }
    const csv = await this.adminService.exportOrdersCsv(
      status,
      fromDate,
      toDate,
    );
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="orders-export-${dateStr}.csv"`,
    });
  }
}
