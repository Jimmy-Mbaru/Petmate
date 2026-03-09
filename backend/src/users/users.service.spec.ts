import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const otherUserId = '660e8400-e29b-41d4-a716-446655440001';
const notFoundUserId = '00000000-0000-0000-0000-000000000000';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: mockUserId,
    email: 'user@example.com',
    name: 'User One',
    role: Role.OWNER,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne(mockUserId);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(notFoundUserId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(notFoundUserId)).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    const dto: UpdateUserDto = { name: 'Updated Name' };

    it('should update own profile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: dto.name,
      });

      const result = await service.update(mockUserId, dto, mockUserId, Role.OWNER);

      expect(result.name).toBe('Updated Name');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: expect.objectContaining({ name: dto.name }),
        }),
      );
    });

    it('should allow admin to update another user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: dto.name,
      });

      await service.update(mockUserId, dto, otherUserId, Role.ADMIN);

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin updates another user', async () => {
      await expect(
        service.update(otherUserId, dto, mockUserId, Role.OWNER),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(otherUserId, dto, mockUserId, Role.OWNER),
      ).rejects.toThrow('You can only update your own profile');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(notFoundUserId, dto, notFoundUserId, Role.OWNER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should deactivate user when caller is admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.remove(mockUserId, Role.ADMIN);

      expect(result).toEqual({ message: 'User deactivated successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          isActive: false,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw ForbiddenException when non-admin deletes user', async () => {
      await expect(service.remove(mockUserId, Role.OWNER)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(mockUserId, Role.OWNER)).rejects.toThrow(
        'Only admin can delete users',
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(notFoundUserId, Role.ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
