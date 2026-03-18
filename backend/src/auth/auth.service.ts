import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaClient, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** Delegate for RefreshToken model (used when PrismaClient type is not yet regenerated). */
interface RefreshTokenDelegate {
  create(args: {
    data: { userId: string; tokenHash: string; expiresAt: Date };
  }): Promise<{ id: string }>;
  findFirst(args: {
    where: {
      tokenHash: string;
      expiresAt: { gt: Date };
      revokedAt: null;
    };
    select: { userId: true };
  }): Promise<{ userId: string } | null>;
  updateMany(args: {
    where: { tokenHash: string };
    data: { revokedAt: Date };
  }): Promise<{ count: number }>;
}
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AUTH } from './constants/auth.constant';
import type { ApiMessageResponse } from '../common/interfaces/api-response.interface';
import { randomBytes, createHash } from 'crypto';

/** User fields needed for auth responses (avoids relying on Prisma User when lint type-check can't resolve it). */
type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
};

/** Full user from DB as returned by findUnique (for login/register). */
type DbUser = AuthUser & {
  password: string;
  isActive: boolean;
  emailVerified: boolean;
  deletedAt: Date | null;
};

type GetMeUser = AuthUser & { isActive: boolean; createdAt: Date };

/**
 * JWT payload (sub = user id UUID, email, role).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/**
 * Auth response returned by register/login (access token, refresh token, and user summary).
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
  };
}

/**
 * Auth service: registration, login, JWT, email verification, password reset.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /** Typed client including RefreshToken delegate (safe when Prisma client is not yet regenerated). */
  private get client(): PrismaClient & { refreshToken: RefreshTokenDelegate } {
    return this.prisma as unknown as PrismaClient & {
      refreshToken: RefreshTokenDelegate;
    };
  }
  /**
   * Find a user by email
   * @param email - The email of the user
   * @returns The user
   */
  private findUserByEmail(email: string): Promise<DbUser | null> {
    // Cast to relax Prisma's generated types slightly while keeping runtime safety.
    return this.client.user.findFirst({
      where: { email, deletedAt: null } as unknown as Record<string, unknown>,
    }) as Promise<DbUser | null>;
  }

  /**
   * Find a user by ID
   * @param id - The ID of the user
   * @returns The user
   */
  private findUserById(id: string): Promise<GetMeUser | null> {
    return this.client.user.findFirst({
      where: { id, deletedAt: null } as unknown as Record<string, unknown>,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    }) as Promise<GetMeUser | null>;
  }

  /**
   * Create a new user
   * @param data - The data for the user
   * @returns The created user
   */
  private createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }): Promise<AuthUser> {
    return this.client.user.create({ data }) as Promise<AuthUser>;
  }

  /**
   * Register a new user. Hashes password and returns JWT + user.
   * @param dto - Registration data (name, email, password, role)
   * @returns Auth response with access_token and user
   * @throws ConflictException if email already exists
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const existing = await this.findUserByEmail(dto.email);
      if (existing) {
        throw new ConflictException(`${dto.email} already registered`);
      }
      const hashedPassword = await bcrypt.hash(dto.password, AUTH.SALT_ROUNDS);
      const user = await this.createUser({
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      });
      const { token } = await this.createEmailVerification(user.id, user.email);
      
      // Send verification email
      await this.emailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken: token,
      });
      
      return await this.buildAuthResponse(user);
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Register failed', error);
      throw error;
    }
  }

  /**
   * Validate credentials and return JWT + user.
   * @param dto - Login data (email, password)
   * @returns Auth response with access_token and user
   * @throws UnauthorizedException if invalid credentials or user inactive
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.findUserByEmail(dto.email);
      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return await this.buildAuthResponse(user);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Return current user profile by id.
   * @param userId - The ID of the user
   * @returns User profile (no password)
   * @throws UnauthorizedException if not found or inactive
   */
  async getMe(userId: string): Promise<GetMeUser> {
    try {
      const user = await this.findUserById(userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('GetMe failed', error);
      throw error;
    }
  }

  /**
   * Hash a refresh token for storage (SHA-256).
   */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create and persist a refresh token for the user; returns the plain token (to send to client).
   */
  private async createRefreshToken(userId: string): Promise<string> {
    const plain = randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(plain);
    const expiresAt = new Date(
      Date.now() + AUTH.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.client.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return plain;
  }

  /**
   * Validate refresh token: must exist, not expired, not revoked. Returns user id or null.
   */
  private async validateRefreshToken(
    plainToken: string,
  ): Promise<string | null> {
    const tokenHash = this.hashRefreshToken(plainToken);
    const now = new Date();
    const record = await this.client.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: now },
        revokedAt: null,
      },
      select: { userId: true },
    });
    return record?.userId ?? null;
  }

  /**
   * Revoke a refresh token by its plain value (e.g. on refresh with rotation).
   */
  private async revokeRefreshToken(plainToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(plainToken);
    await this.client.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Build the auth response (access token, refresh token, user).
   * @param user - The user
   * @returns The auth response
   */
  private async buildAuthResponse(user: AuthUser): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.createRefreshToken(user.id);
    const userResponse: AuthResponse['user'] = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
    return { access_token, refresh_token, user: userResponse };
  }

  /**
   * Create an email verification token
   * @param userId - The ID of the user
   * @param email - The email of the user
   * @returns The created email verification token
   */
  private async createEmailVerification(
    userId: string,
    email: string,
  ): Promise<{ token: string }> {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    await this.client.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationTokenExpires: expires,
      } as unknown as Record<string, unknown>,
    });
    return { token };
  }

  /**
   * Verify email using the token sent to the user.
   * @param token - The verification token
   * @returns Success message
   * @throws BadRequestException if token invalid or expired
   */
  async verifyEmail(token: string): Promise<ApiMessageResponse> {
    try {
      const user = await this.client.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: { gt: new Date() },
          deletedAt: null,
        } as unknown as Record<string, unknown>,
      });
      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }
      await this.client.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        } as unknown as Record<string, unknown>,
      });
      
      // Send welcome email after successful verification
      await this.emailService.sendWelcomeEmail({
        email: user.email,
        name: user.name,
      });
      
      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Verify email failed', error);
      throw error;
    }
  }

  /**
   * Generate a password reset token for the given email and persist it with expiry.
   * Does not reveal whether the email exists.
   * @param email - The user's email
   * @returns Generic message (same whether email exists or not)
   */
  async requestPasswordReset(email: string): Promise<ApiMessageResponse> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        // Do not leak user existence
        return { message: 'If this email exists, a reset link has been sent' };
      }
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await this.client.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        } as unknown as Record<string, unknown>,
      });

      // Send password reset email
      await this.emailService.sendResetPasswordEmail({
        email: user.email,
        name: user.name,
        resetToken: token,
      });

      return {
        message: 'If this email exists, a reset link has been sent',
      };
    } catch (error) {
      this.logger.error('Request password reset failed', error);
      throw error;
    }
  }

  /**
   * Exchange a valid refresh token for a new access token (and optionally a new refresh token if rotate=true).
   * When rotating, the old refresh token is revoked.
   * @param refreshToken - The refresh token from login/register or previous refresh
   * @param rotate - If true, issue a new refresh token and revoke the old one (recommended for security)
   * @returns New access_token and user; if rotate, also new refresh_token
   * @throws UnauthorizedException if refresh token invalid or expired
   */
  async refresh(refreshToken: string, rotate = true): Promise<AuthResponse> {
    const userId = await this.validateRefreshToken(refreshToken);
    if (userId == null) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.findUserById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (rotate) {
      await this.revokeRefreshToken(refreshToken);
    }
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
    if (rotate) {
      return await this.buildAuthResponse(authUser);
    }
    const payload: JwtPayload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
    };
    const access_token = this.jwtService.sign(payload);
    const existingRefresh = refreshToken; // reuse same token when not rotating
    return {
      access_token,
      refresh_token: existingRefresh,
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        avatarUrl: authUser.avatarUrl,
      },
    };
  }

  /**
   * Resend verification email.
   * Does not reveal whether the email exists.
   */
  async resendVerification(email: string): Promise<ApiMessageResponse> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        return { message: 'If this email exists, a verification link has been sent' };
      }
      if ((user as DbUser & { emailVerified?: boolean }).emailVerified) {
        return { message: 'Email already verified' };
      }
      const { token } = await this.createEmailVerification(user.id, user.email);
      await this.emailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken: token,
      });
      return { message: 'If this email exists, a verification link has been sent' };
    } catch (error) {
      this.logger.error('Resend verification failed', error);
      throw error;
    }
  }

  /**
   * Reset password using a valid token (not expired).
   * @param token - The reset token from requestPasswordReset
   * @param newPassword - The new password to set
   * @returns Success message
   * @throws BadRequestException if token invalid or expired
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<ApiMessageResponse> {
    try {
      const user = await this.client.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() },
          deletedAt: null,
        } as unknown as Record<string, unknown>,
      });
      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      const hashedPassword = await bcrypt.hash(newPassword, AUTH.SALT_ROUNDS);
      await this.client.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        } as unknown as Record<string, unknown>,
      });
      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Reset password failed', error);
      throw error;
    }
  }
}
