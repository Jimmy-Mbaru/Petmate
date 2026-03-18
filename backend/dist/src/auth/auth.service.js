"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const auth_constant_1 = require("./constants/auth.constant");
const crypto_1 = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    emailService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    get client() {
        return this.prisma;
    }
    findUserByEmail(email) {
        return this.client.user.findFirst({
            where: { email, deletedAt: null },
        });
    }
    findUserById(id) {
        return this.client.user.findFirst({
            where: { id, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
            },
        });
    }
    createUser(data) {
        return this.client.user.create({ data });
    }
    async register(dto) {
        try {
            const existing = await this.findUserByEmail(dto.email);
            if (existing) {
                throw new common_1.ConflictException(`${dto.email} already registered`);
            }
            const hashedPassword = await bcrypt.hash(dto.password, auth_constant_1.AUTH.SALT_ROUNDS);
            const user = await this.createUser({
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                role: dto.role,
            });
            const { token } = await this.createEmailVerification(user.id, user.email);
            await this.emailService.sendVerificationEmail({
                email: user.email,
                name: user.name,
                verificationToken: token,
            });
            return await this.buildAuthResponse(user);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException)
                throw error;
            this.logger.error('Register failed', error);
            throw error;
        }
    }
    async login(dto) {
        try {
            const user = await this.findUserByEmail(dto.email);
            if (!user || !user.isActive || user.deletedAt) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const isMatch = await bcrypt.compare(dto.password, user.password);
            if (!isMatch) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            return await this.buildAuthResponse(user);
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            this.logger.error('Login failed', error);
            throw error;
        }
    }
    async getMe(userId) {
        try {
            const user = await this.findUserById(userId);
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('User not found or inactive');
            }
            return user;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            this.logger.error('GetMe failed', error);
            throw error;
        }
    }
    hashRefreshToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    async createRefreshToken(userId) {
        const plain = (0, crypto_1.randomBytes)(48).toString('hex');
        const tokenHash = this.hashRefreshToken(plain);
        const expiresAt = new Date(Date.now() + auth_constant_1.AUTH.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        await this.client.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
        return plain;
    }
    async validateRefreshToken(plainToken) {
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
    async revokeRefreshToken(plainToken) {
        const tokenHash = this.hashRefreshToken(plainToken);
        await this.client.refreshToken.updateMany({
            where: { tokenHash },
            data: { revokedAt: new Date() },
        });
    }
    async buildAuthResponse(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const access_token = this.jwtService.sign(payload);
        const refresh_token = await this.createRefreshToken(user.id);
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
        };
        return { access_token, refresh_token, user: userResponse };
    }
    async createEmailVerification(userId, email) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
        await this.client.user.update({
            where: { id: userId },
            data: {
                verificationToken: token,
                verificationTokenExpires: expires,
            },
        });
        return { token };
    }
    async verifyEmail(token) {
        try {
            const user = await this.client.user.findFirst({
                where: {
                    verificationToken: token,
                    verificationTokenExpires: { gt: new Date() },
                    deletedAt: null,
                },
            });
            if (!user) {
                throw new common_1.BadRequestException('Invalid or expired verification token');
            }
            await this.client.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    verificationToken: null,
                    verificationTokenExpires: null,
                },
            });
            await this.emailService.sendWelcomeEmail({
                email: user.email,
                name: user.name,
            });
            return { message: 'Email verified successfully' };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Verify email failed', error);
            throw error;
        }
    }
    async requestPasswordReset(email) {
        try {
            const user = await this.findUserByEmail(email);
            if (!user) {
                return { message: 'If this email exists, a reset link has been sent' };
            }
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            const expires = new Date(Date.now() + 1000 * 60 * 60);
            await this.client.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: token,
                    resetPasswordExpires: expires,
                },
            });
            await this.emailService.sendResetPasswordEmail({
                email: user.email,
                name: user.name,
                resetToken: token,
            });
            return {
                message: 'If this email exists, a reset link has been sent',
            };
        }
        catch (error) {
            this.logger.error('Request password reset failed', error);
            throw error;
        }
    }
    async refresh(refreshToken, rotate = true) {
        const userId = await this.validateRefreshToken(refreshToken);
        if (userId == null) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.findUserById(userId);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        if (rotate) {
            await this.revokeRefreshToken(refreshToken);
        }
        const authUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
        };
        if (rotate) {
            return await this.buildAuthResponse(authUser);
        }
        const payload = {
            sub: authUser.id,
            email: authUser.email,
            role: authUser.role,
        };
        const access_token = this.jwtService.sign(payload);
        const existingRefresh = refreshToken;
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
    async resetPassword(token, newPassword) {
        try {
            const user = await this.client.user.findFirst({
                where: {
                    resetPasswordToken: token,
                    resetPasswordExpires: { gt: new Date() },
                    deletedAt: null,
                },
            });
            if (!user) {
                throw new common_1.BadRequestException('Invalid or expired reset token');
            }
            const hashedPassword = await bcrypt.hash(newPassword, auth_constant_1.AUTH.SALT_ROUNDS);
            await this.client.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            });
            return { message: 'Password has been reset successfully' };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Reset password failed', error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map