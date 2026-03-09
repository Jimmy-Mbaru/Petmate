import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    role: Role.OWNER,
    avatarUrl: null,
    password: 'hashed',
    isActive: true,
  };

  const mockAuthResponse = {
    access_token: 'jwt-token',
    user: {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      role: Role.OWNER,
      avatarUrl: null,
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue(0),
      },
    };
    const mockJwt = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto: RegisterDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: Role.OWNER,
    };

    it('should register a new user and return auth response', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: mockUserId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        avatarUrl: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register(dto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: dto.email }) }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: dto.email,
          password: 'hashed',
          role: dto.role,
        },
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe(dto.email);
      expect(result.user.name).toBe(dto.name);
    });

    it('should throw ConflictException when email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow(
        'test@example.com already registered',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return auth response for valid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: dto.email }) }),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, mockUser.password);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.id).toBe(mockUserId);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getMe', () => {
    it('should return user when found and active', async () => {
      const meUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        role: Role.OWNER,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(meUser);

      const result = await service.getMe(mockUserId);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: mockUserId }),
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        }),
      );
      expect(result).toEqual(meUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('00000000-0000-0000-0000-000000000000')).rejects.toThrow(UnauthorizedException);
      await expect(service.getMe('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: mockUserId,
        isActive: false,
      });

      await expect(service.getMe(mockUserId)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and clear token when valid', async () => {
      const userWithToken = { id: mockUserId, email: 'test@example.com' };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userWithToken);
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        }),
      });
    });

    it('should throw BadRequestException when token invalid or expired', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should return same message whether email exists or not', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@example.com');

      expect(result.message).toBe(
        'If this email exists, a reset link has been sent',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should set reset token when user exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: mockUserId,
        email: 'user@example.com',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.requestPasswordReset('user@example.com');

      expect(result.message).toBe(
        'If this email exists, a reset link has been sent',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        }),
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password when token valid', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: mockUserId });
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashed');

      const result = await service.resetPassword('valid-token', 'newPass123');

      expect(result).toEqual({ message: 'Password has been reset successfully' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPass123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          password: 'newHashed',
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }),
      });
    });

    it('should throw BadRequestException when token invalid or expired', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'newPass123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword('bad-token', 'newPass123'),
      ).rejects.toThrow('Invalid or expired reset token');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });
});
