import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { CurrentUserPayload } from './decorators/current-user.decorator';
import type { ApiMessageResponse } from '../common/interfaces/api-response.interface';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<import("./auth.service").AuthResponse>;
    refresh(dto: RefreshTokenDto, rotate?: string): Promise<import("./auth.service").AuthResponse>;
    login(dto: LoginDto): Promise<import("./auth.service").AuthResponse>;
    forgotPassword(dto: ForgotPasswordDto): Promise<ApiMessageResponse>;
    resetPassword(dto: ResetPasswordDto): Promise<ApiMessageResponse>;
    me(user: CurrentUserPayload): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").Role;
        avatarUrl: string | null;
    } & {
        isActive: boolean;
        createdAt: Date;
    }>;
    verifyEmail(token: string): Promise<ApiMessageResponse>;
}
