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
var FavoritesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FavoritesService = FavoritesService_1 = class FavoritesService {
    prisma;
    logger = new common_1.Logger(FavoritesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFavoritePets(userId) {
        const rows = await this.prisma.userFavoritePet.findMany({
            where: { userId },
            include: {
                pet: {
                    include: { owner: { select: { id: true, name: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => r.pet);
    }
    async addFavoritePet(userId, petId) {
        const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
        if (!pet)
            throw new common_1.NotFoundException('Pet not found');
        try {
            await this.prisma.userFavoritePet.create({
                data: { userId, petId },
            });
        }
        catch (e) {
            if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                throw new common_1.ConflictException('Pet already in favorites');
            }
            throw e;
        }
        return { message: 'Pet added to favorites' };
    }
    async removeFavoritePet(userId, petId) {
        const deleted = await this.prisma.userFavoritePet.deleteMany({
            where: { userId, petId },
        });
        if (deleted.count === 0) {
            throw new common_1.NotFoundException('Favorite not found');
        }
        return { message: 'Pet removed from favorites' };
    }
    async getFavoriteBoardingProfiles(userId) {
        const rows = await this.prisma.userFavoriteBoardingProfile.findMany({
            where: { userId },
            include: {
                boardingProfile: {
                    include: { host: { select: { id: true, name: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => r.boardingProfile);
    }
    async addFavoriteBoardingProfile(userId, boardingProfileId) {
        const profile = await this.prisma.boardingProfile.findUnique({
            where: { id: boardingProfileId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Boarding profile not found');
        try {
            await this.prisma.userFavoriteBoardingProfile.create({
                data: { userId, boardingProfileId },
            });
        }
        catch (e) {
            if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                throw new common_1.ConflictException('Boarding profile already in favorites');
            }
            throw e;
        }
        return { message: 'Boarding profile added to favorites' };
    }
    async removeFavoriteBoardingProfile(userId, boardingProfileId) {
        const deleted = await this.prisma.userFavoriteBoardingProfile.deleteMany({
            where: { userId, boardingProfileId },
        });
        if (deleted.count === 0) {
            throw new common_1.NotFoundException('Favorite not found');
        }
        return { message: 'Boarding profile removed from favorites' };
    }
    async getFavoriteProducts(userId) {
        const rows = await this.prisma.userFavoriteProduct.findMany({
            where: { userId },
            include: {
                product: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => this.normalizeProductImageUrls(r.product));
    }
    normalizeProductImageUrls(product) {
        if (product?.imageUrls != null) {
            try {
                if (typeof product.imageUrls === 'string') {
                    const parsed = JSON.parse(product.imageUrls);
                    product.imageUrls = Array.isArray(parsed) ? parsed : [parsed];
                }
                else if (!Array.isArray(product.imageUrls)) {
                    product.imageUrls = [];
                }
            }
            catch {
                product.imageUrls = [];
            }
        }
        else {
            product.imageUrls = [];
        }
        return product;
    }
    async addFavoriteProduct(userId, productId) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        try {
            await this.prisma.userFavoriteProduct.create({
                data: { userId, productId },
            });
        }
        catch (e) {
            if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                throw new common_1.ConflictException('Product already in wishlist');
            }
            throw e;
        }
        return { message: 'Product added to wishlist' };
    }
    async removeFavoriteProduct(userId, productId) {
        const deleted = await this.prisma.userFavoriteProduct.deleteMany({
            where: { userId, productId },
        });
        if (deleted.count === 0) {
            throw new common_1.NotFoundException('Wishlist item not found');
        }
        return { message: 'Product removed from wishlist' };
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = FavoritesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map