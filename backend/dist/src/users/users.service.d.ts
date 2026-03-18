import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
export declare class UsersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        bio: string | null;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
        emailVerified: boolean;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        verificationToken: string | null;
        verificationTokenExpires: Date | null;
    }>;
    update(id: string, dto: UpdateUserDto, currentUserId: string, currentUserRole: Role): Promise<{
        id: string;
        email: string;
        name: string;
        bio: string | null;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
    }>;
    remove(id: string, currentUserRole: Role): Promise<{
        message: string;
    }>;
}
