import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const notFoundUserId = '00000000-0000-0000-0000-000000000000';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      boardingProfile: { findMany: jest.fn(), count: jest.fn() },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      booking: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [
        {
          id: mockUserId,
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
          avatarUrl: null,
          isActive: true,
          createdAt: new Date(),
        },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getUsers(20, 0);

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

  describe('getBoardingPendingApproval', () => {
    it('should return paginated unapproved boarding profiles', async () => {
      (prisma.boardingProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.boardingProfile.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getBoardingPendingApproval(20, 0);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(prisma.boardingProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isApproved: false },
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.order.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrders(20, 0);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('getDashboard', () => {
    it('should return platform stats', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      (prisma.booking.count as jest.Mock).mockResolvedValue(5);
      (prisma.order.count as jest.Mock).mockResolvedValue(20);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 1500.5 },
      });

      const result = await service.getDashboard();

      expect(result).toEqual({
        totalUsers: 10,
        totalBookings: 5,
        totalOrders: 20,
        totalRevenue: 1500.5,
      });
    });

    it('should return 0 revenue when no orders', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getDashboard();

      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getUsers', () => {
    it('should filter by role when provided', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await service.getUsers(20, 0, 'HOST');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'HOST' },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should filter by email when provided', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await service.getUsers(20, 0, undefined, 'john@');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'john@', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('getBoardingPendingApproval', () => {
    it('should return approved profiles when isApproved true', async () => {
      (prisma.boardingProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.boardingProfile.count as jest.Mock).mockResolvedValue(0);

      await service.getBoardingPendingApproval(20, 0, true);

      expect(prisma.boardingProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isApproved: true },
        }),
      );
    });
  });

  describe('getOrders', () => {
    it('should filter by status and date range when provided', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.order.count as jest.Mock).mockResolvedValue(0);
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      await service.getOrders(20, 0, 'PLACED', from, to);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PLACED',
            createdAt: { gte: from, lte: to },
          },
        }),
      );
    });
  });

  describe('suspendUser', () => {
    it('should set isActive to false', async () => {
      const user = {
        id: mockUserId,
        email: 'u@example.com',
        name: 'User',
        role: 'OWNER',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        isActive: false,
      });

      const result = await service.suspendUser(mockUserId);

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.suspendUser(notFoundUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.suspendUser(notFoundUserId)).rejects.toThrow('User not found');
    });
  });

  describe('activateUser', () => {
    it('should set isActive to true', async () => {
      const user = {
        id: mockUserId,
        email: 'u@example.com',
        name: 'User',
        role: 'OWNER',
        avatarUrl: null,
        isActive: false,
        createdAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        isActive: true,
      });

      const result = await service.activateUser(mockUserId);

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.activateUser(notFoundUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const user = {
        id: mockUserId,
        email: 'u@example.com',
        name: 'User',
        role: 'OWNER',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        role: 'HOST',
      });

      const result = await service.updateUserRole(mockUserId, 'HOST');

      expect(result.role).toBe('HOST');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { role: 'HOST' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateUserRole(notFoundUserId, 'ADMIN')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateUserRole(notFoundUserId, 'ADMIN')).rejects.toThrow(
        'User not found',
      );
    });
  });
});
