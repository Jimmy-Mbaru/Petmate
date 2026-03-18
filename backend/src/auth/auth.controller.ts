import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserPayload } from './decorators/current-user.decorator';
import { ApiResponsesAuth } from '../common/decorators/api-responses.decorator';
import type { ApiMessageResponse } from '../common/interfaces/api-response.interface';

const authLimit = process.env.NODE_ENV === 'test' ? 10_000 : 5;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: authLimit, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto, description: 'User registration data' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, returns access_token and user',
    type: AuthResponseDto,
  })
  @ApiResponsesAuth()
  async register(@Body() dto: RegisterDto) {
    try {
      this.logger.log(`Register attempt for email: ${dto.email}`);
      const result = await this.authService.register(dto);
      this.logger.log(`User registered successfully: ${dto.email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Register failed for ${dto.email}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('refresh')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchange a valid refresh_token for a new access_token. By default rotates the refresh token (issues new one, revokes old). Send ?rotate=false to reuse the same refresh token.',
  })
  @ApiBody({ type: RefreshTokenDto, description: 'Refresh token from login/register' })
  @ApiResponse({
    status: 200,
    description: 'New access_token (and refresh_token if rotating)',
    type: AuthResponseDto,
  })
  @ApiResponsesAuth()
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Query('rotate') rotate?: string,
  ) {
    try {
      const rotateToken = rotate !== 'false';
      return await this.authService.refresh(dto.refresh_token, rotateToken);
    } catch (error) {
      this.logger.error('Refresh token failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Post('login')
  @Throttle({ auth: { limit: authLimit, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get JWT' })
  @ApiBody({ type: LoginDto, description: 'Login credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access_token, refresh_token and user',
    type: AuthResponseDto,
  })
  @ApiResponsesAuth()
  async login(@Body() dto: LoginDto) {
    try {
      this.logger.log(`Login attempt for email: ${dto.email}`);
      const result = await this.authService.login(dto);
      this.logger.log(`User logged in successfully: ${dto.email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Login failed for ${dto.email}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ type: ForgotPasswordDto, description: 'Email to resend verification to' })
  @ApiResponse({ status: 200, description: 'Generic response to avoid leaking whether the email exists' })
  async resendVerification(@Body() dto: ForgotPasswordDto): Promise<ApiMessageResponse> {
    try {
      return await this.authService.resendVerification(dto.email);
    } catch (error) {
      this.logger.error('Resend verification failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email to send password reset link to',
  })
  @ApiResponse({
    status: 200,
    description:
      'Always returns a generic message to avoid leaking whether the email exists',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ApiMessageResponse> {
    try {
      this.logger.log(`Password reset requested for email: ${dto.email}`);
      return await this.authService.requestPasswordReset(dto.email);
    } catch (error) {
      this.logger.error(
        `Forgot password failed for ${dto.email}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset token and new password',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<ApiMessageResponse> {
    try {
      this.logger.log('Reset password attempt using token');
      return await this.authService.resetPassword(dto.token, dto.newPassword);
    } catch (error) {
      this.logger.error(
        'Reset password failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user (requires JWT)' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    try {
      this.logger.debug(`GetMe requested for user id: ${user.id}`);
      return await this.authService.getMe(user.id);
    } catch (error) {
      this.logger.error(
        `GetMe failed for user id: ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using token from link' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<ApiMessageResponse> {
    try {
      this.logger.log('Verify email attempt using token');
      return await this.authService.verifyEmail(token);
    } catch (error) {
      this.logger.error(
        'Verify email failed',
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
