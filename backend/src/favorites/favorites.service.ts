import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Favorites service: add/remove/list favorite pets and boarding profiles.
 */
@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List favorite pet IDs for a user (with pet details). */
  async getFavoritePets(userId: string) {
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

  /** Add a pet to favorites. */
  async addFavoritePet(userId: string, petId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Pet not found');
    try {
      await this.prisma.userFavoritePet.create({
        data: { userId, petId },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Pet already in favorites');
      }
      throw e;
    }
    return { message: 'Pet added to favorites' };
  }

  /** Remove a pet from favorites. */
  async removeFavoritePet(userId: string, petId: string) {
    const deleted = await this.prisma.userFavoritePet.deleteMany({
      where: { userId, petId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Favorite not found');
    }
    return { message: 'Pet removed from favorites' };
  }

  /** List favorite boarding profile IDs for a user (with profile details). */
  async getFavoriteBoardingProfiles(userId: string) {
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

  /** Add a boarding profile to favorites. */
  async addFavoriteBoardingProfile(userId: string, boardingProfileId: string) {
    const profile = await this.prisma.boardingProfile.findUnique({
      where: { id: boardingProfileId },
    });
    if (!profile) throw new NotFoundException('Boarding profile not found');
    try {
      await this.prisma.userFavoriteBoardingProfile.create({
        data: { userId, boardingProfileId },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Boarding profile already in favorites');
      }
      throw e;
    }
    return { message: 'Boarding profile added to favorites' };
  }

  /** Remove a boarding profile from favorites. */
  async removeFavoriteBoardingProfile(
    userId: string,
    boardingProfileId: string,
  ) {
    const deleted = await this.prisma.userFavoriteBoardingProfile.deleteMany({
      where: { userId, boardingProfileId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Favorite not found');
    }
    return { message: 'Boarding profile removed from favorites' };
  }

  /** List favorite product IDs for a user (with product details). */
  async getFavoriteProducts(userId: string) {
    const rows = await this.prisma.userFavoriteProduct.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.normalizeProductImageUrls(r.product as Record<string, unknown>));
  }

  /** Ensure product imageUrls is an array for API consumers (DB stores it as JSON string). */
  private normalizeProductImageUrls(product: Record<string, unknown>): Record<string, unknown> {
    if (product?.imageUrls != null) {
      try {
        if (typeof product.imageUrls === 'string') {
          const parsed = JSON.parse(product.imageUrls);
          product.imageUrls = Array.isArray(parsed) ? parsed : [parsed];
        } else if (!Array.isArray(product.imageUrls)) {
          product.imageUrls = [];
        }
      } catch {
        product.imageUrls = [];
      }
    } else {
      product.imageUrls = [];
    }
    return product;
  }

  /** Add a product to favorites (wishlist). */
  async addFavoriteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    try {
      await this.prisma.userFavoriteProduct.create({
        data: { userId, productId },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Product already in wishlist');
      }
      throw e;
    }
    return { message: 'Product added to wishlist' };
  }

  /** Remove a product from favorites (wishlist). */
  async removeFavoriteProduct(userId: string, productId: string) {
    const deleted = await this.prisma.userFavoriteProduct.deleteMany({
      where: { userId, productId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Wishlist item not found');
    }
    return { message: 'Product removed from wishlist' };
  }
}
