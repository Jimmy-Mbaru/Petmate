import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    private readonly logger;
    constructor(usersService: UsersService);
    findAll(pagination: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
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
    update(id: string, dto: UpdateUserDto, user: CurrentUserPayload): Promise<{
        id: string;
        email: string;
        name: string;
        bio: string | null;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
    }>;
    remove(id: string, user: CurrentUserPayload): Promise<{
        message: string;
    }>;
}
