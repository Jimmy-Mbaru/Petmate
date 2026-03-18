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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const userSelect = {
    id: true,
    email: true,
    name: true,
    bio: true,
    role: true,
    avatarUrl: true,
    isActive: true,
    createdAt: true,
};
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(limit, offset) {
        try {
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const [data, total] = await Promise.all([
                this.prisma.user.findMany({
                    select: userSelect,
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                    take,
                    skip,
                }),
                this.prisma.user.count({
                    where: { deletedAt: null },
                }),
            ]);
            return { data, total, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('FindAll users failed', error);
            throw error;
        }
    }
    async findOne(id) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
            });
            if (!user || user.deletedAt)
                throw new common_1.NotFoundException('User not found');
            const { deletedAt, ...rest } = user;
            return rest;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('FindOne user failed', error);
            throw error;
        }
    }
    async update(id, dto, currentUserId, currentUserRole) {
        try {
            if (currentUserRole !== client_1.Role.ADMIN && currentUserId !== id) {
                throw new common_1.ForbiddenException('You can only update your own profile');
            }
            const user = await this.prisma.user.findUnique({ where: { id } });
            if (!user || user.deletedAt)
                throw new common_1.NotFoundException('User not found');
            const updated = await this.prisma.user.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.bio !== undefined && { bio: dto.bio }),
                    ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    bio: true,
                    role: true,
                    avatarUrl: true,
                    isActive: true,
                },
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException ||
                error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Update user failed', error);
            throw error;
        }
    }
    async remove(id, currentUserRole) {
        try {
            if (currentUserRole !== client_1.Role.ADMIN) {
                throw new common_1.ForbiddenException('Only admin can delete users');
            }
            const user = await this.prisma.user.findUnique({ where: { id } });
            if (!user || user.deletedAt)
                throw new common_1.NotFoundException('User not found');
            await this.prisma.user.update({
                where: { id },
                data: {
                    isActive: false,
                    deletedAt: new Date(),
                },
            });
            const message = 'User deactivated successfully';
            return { message };
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException ||
                error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Remove user failed', error);
            throw error;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map