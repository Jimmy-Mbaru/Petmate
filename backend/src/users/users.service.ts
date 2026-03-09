import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { ApiMessageResponse } from '../common/interfaces/api-response.interface';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  bio: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
} as const;

/**
 * Users service: list users, get one, update profile, deactivate (soft delete).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List users with pagination (excludes soft-deleted).
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of users (no password)
   */
  async findAll(limit?: number, offset?: number): Promise<PaginatedResponse<unknown>> {
    try {
      const { take, skip } = getPaginationParams(limit, offset);
      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          select: userSelect,
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.prisma.user.count({
          where: { deletedAt: null },
        }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('FindAll users failed', error);
      throw error;
    }
  }

  /**
   * Get a user by id (excludes deletedAt; response has no password).
   * @param id - The user ID
   * @returns The user (safe fields only)
   * @throws NotFoundException if user not found or soft-deleted
   */
  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!user || user.deletedAt)
        throw new NotFoundException('User not found');
      const { deletedAt, ...rest } = user;
      return rest;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('FindOne user failed', error);
      throw error;
    }
  }

  /**
   * Update a user (name, avatarUrl). Admin can update any; others only self.
   * @param id - The user ID to update
   * @param dto - Fields to update (name, avatarUrl)
   * @param currentUserId - The current user's ID
   * @param currentUserRole - The current user's role
   * @returns The updated user (safe fields only)
   * @throws ForbiddenException if non-admin updating another user
   * @throws NotFoundException if user not found or soft-deleted
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    try {
      if (currentUserRole !== Role.ADMIN && currentUserId !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user || user.deletedAt)
        throw new NotFoundException('User not found');
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          role: true,
          avatarUrl: true,
          isActive: true,
        },
      });
      return updated;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error('Update user failed', error);
      throw error;
    }
  }

  /**
   * Soft-delete a user (admin only). Sets isActive false and deletedAt.
   * @param id - The user ID to deactivate
   * @param currentUserRole - The current user's role (must be ADMIN)
   * @returns Success message
   * @throws ForbiddenException if not admin
   * @throws NotFoundException if user not found or already soft-deleted
   */
  async remove(id: string, currentUserRole: Role) {
    try {
      if (currentUserRole !== Role.ADMIN) {
        throw new ForbiddenException('Only admin can delete users');
      }
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user || user.deletedAt)
        throw new NotFoundException('User not found');
      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });
      const message = 'User deactivated successfully';
      return { message } satisfies ApiMessageResponse;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error('Remove user failed', error);
      throw error;
    }
  }
}
