import { PrismaService } from '../prisma/prisma.service';
export declare class FavoritesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getFavoritePets(userId: string): Promise<({
        owner: {
            id: string;
            name: string;
        };
    } & {
        photoUrls: string[];
        id: string;
        name: string;
        createdAt: Date;
        species: string;
        breed: string;
        age: number;
        gender: string;
        healthNotes: string | null;
        photoUrl: string | null;
        isAvailable: boolean;
        ownerId: string;
    })[]>;
    addFavoritePet(userId: string, petId: string): Promise<{
        message: string;
    }>;
    removeFavoritePet(userId: string, petId: string): Promise<{
        message: string;
    }>;
    getFavoriteBoardingProfiles(userId: string): Promise<({
        host: {
            id: string;
            name: string;
        };
    } & {
        location: string;
        capacity: number;
        pricePerDay: number;
        description: string | null;
        isApproved: boolean;
        documentUrls: string[];
        latitude: number | null;
        longitude: number | null;
        photoUrls: string[];
        maxPetsPerNight: number | null;
        hostId: string;
        id: string;
    })[]>;
    addFavoriteBoardingProfile(userId: string, boardingProfileId: string): Promise<{
        message: string;
    }>;
    removeFavoriteBoardingProfile(userId: string, boardingProfileId: string): Promise<{
        message: string;
    }>;
    getFavoriteProducts(userId: string): Promise<Record<string, unknown>[]>;
    private normalizeProductImageUrls;
    addFavoriteProduct(userId: string, productId: string): Promise<{
        message: string;
    }>;
    removeFavoriteProduct(userId: string, productId: string): Promise<{
        message: string;
    }>;
}
