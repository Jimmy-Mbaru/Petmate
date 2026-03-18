"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
const authLimit = process.env.NODE_ENV === 'test' ? 10_000 : 5;
let AuthController = AuthController_1 = class AuthController {
    authService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService) {
        this.authService = authService;
    }
    async register(dto) {
        try {
            this.logger.log(`Register attempt for email: ${dto.email}`);
            const result = await this.authService.register(dto);
            this.logger.log(`User registered successfully: ${dto.email}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Register failed for ${dto.email}`, error?.stack);
            throw error;
        }
    }
    async refresh(dto, rotate) {
        try {
            const rotateToken = rotate !== 'false';
            return await this.authService.refresh(dto.refresh_token, rotateToken);
        }
        catch (error) {
            this.logger.error('Refresh token failed', error?.stack);
            throw error;
        }
    }
    async login(dto) {
        try {
            this.logger.log(`Login attempt for email: ${dto.email}`);
            const result = await this.authService.login(dto);
            this.logger.log(`User logged in successfully: ${dto.email}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Login failed for ${dto.email}`, error?.stack);
            throw error;
        }
    }
    async forgotPassword(dto) {
        try {
            this.logger.log(`Password reset requested for email: ${dto.email}`);
            return await this.authService.requestPasswordReset(dto.email);
        }
        catch (error) {
            this.logger.error(`Forgot password failed for ${dto.email}`, error?.stack);
            throw error;
        }
    }
    async resetPassword(dto) {
        try {
            this.logger.log('Reset password attempt using token');
            return await this.authService.resetPassword(dto.token, dto.newPassword);
        }
        catch (error) {
            this.logger.error('Reset password failed', error?.stack);
            throw error;
        }
    }
    async me(user) {
        try {
            this.logger.debug(`GetMe requested for user id: ${user.id}`);
            return await this.authService.getMe(user.id);
        }
        catch (error) {
            this.logger.error(`GetMe failed for user id: ${user.id}`, error?.stack);
            throw error;
        }
    }
    async verifyEmail(token) {
        try {
            this.logger.log('Verify email attempt using token');
            return await this.authService.verifyEmail(token);
        }
        catch (error) {
            this.logger.error('Verify email failed', error?.stack);
            throw error;
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ auth: { limit: authLimit, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto, description: 'User registration data' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User registered successfully, returns access_token and user',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, api_responses_decorator_1.ApiResponsesAuth)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, throttler_1.Throttle)({ auth: { limit: 10, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Refresh access token',
        description: 'Exchange a valid refresh_token for a new access_token. By default rotates the refresh token (issues new one, revokes old). Send ?rotate=false to reuse the same refresh token.',
    }),
    (0, swagger_1.ApiBody)({ type: refresh_token_dto_1.RefreshTokenDto, description: 'Refresh token from login/register' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'New access_token (and refresh_token if rotating)',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, api_responses_decorator_1.ApiResponsesAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('rotate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ auth: { limit: authLimit, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login and get JWT' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto, description: 'Login credentials' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful, returns access_token, refresh_token and user',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, api_responses_decorator_1.ApiResponsesAuth)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset link' }),
    (0, swagger_1.ApiBody)({
        type: forgot_password_dto_1.ForgotPasswordDto,
        description: 'Email to send password reset link to',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Always returns a generic message to avoid leaking whether the email exists',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token' }),
    (0, swagger_1.ApiBody)({
        type: reset_password_dto_1.ResetPasswordDto,
        description: 'Password reset token and new password',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user (requires JWT)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current user profile' }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - invalid or missing token',
    }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email using token from link' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email verified successfully',
    }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map