import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { ApiMessageResponse } from '../common/interfaces/api-response.interface';
type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
};
type GetMeUser = AuthUser & {
    isActive: boolean;
    createdAt: Date;
};
export interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
}
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
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, emailService: EmailService);
    private get client();
    private findUserByEmail;
    private findUserById;
    private createUser;
    register(dto: RegisterDto): Promise<AuthResponse>;
    login(dto: LoginDto): Promise<AuthResponse>;
    getMe(userId: string): Promise<GetMeUser>;
    private hashRefreshToken;
    private createRefreshToken;
    private validateRefreshToken;
    private revokeRefreshToken;
    private buildAuthResponse;
    private createEmailVerification;
    verifyEmail(token: string): Promise<ApiMessageResponse>;
    requestPasswordReset(email: string): Promise<ApiMessageResponse>;
    refresh(refreshToken: string, rotate?: boolean): Promise<AuthResponse>;
    resetPassword(token: string, newPassword: string): Promise<ApiMessageResponse>;
}
export {};
