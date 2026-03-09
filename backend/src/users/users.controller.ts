import {
  Controller,
  Get,
  Patch,
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
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (Admin only), paginated' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of users (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async findAll(@Query() pagination: PaginationQueryDto) {
    try {
      this.logger.debug('FindAll users requested');
      return await this.usersService.findAll(pagination.limit, pagination.offset);
    } catch (error) {
      this.logger.error('FindAll users failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponsesProtected()
  async findOne(@Param('id') id: string) {
    try {
      this.logger.debug(`FindOne user requested: ${id}`);
      return await this.usersService.findOne(id);
    } catch (error) {
      this.logger.error(
        `FindOne user failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (own profile or Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Updated user' })
  @ApiResponsesProtected()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Update user requested: ${id} by user ${user.id}`);
      return await this.usersService.update(
        id,
        dto,
        user.id,
        user.role as Role,
      );
    } catch (error) {
      this.logger.error(
        `Update user failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponsesProtected()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Delete user requested: ${id} by admin ${user.id}`);
      return await this.usersService.remove(id, user.role as Role);
    } catch (error) {
      this.logger.error(
        `Delete user failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
