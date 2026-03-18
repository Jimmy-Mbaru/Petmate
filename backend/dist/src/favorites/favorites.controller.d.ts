import { FavoritesService } from './favorites.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
export declare class FavoritesController {
    private readonly favoritesService;
    private readonly logger;
    constructor(favoritesService: FavoritesService);
    getFavoritePets(user: CurrentUserPayload): Promise<({
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
    addFavoritePet(user: CurrentUserPayload, petId: string): Promise<{
        message: string;
    }>;
    removeFavoritePet(user: CurrentUserPayload, petId: string): Promise<{
        message: string;
    }>;
    getFavoriteBoardingProfiles(user: CurrentUserPayload): Promise<({
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
    addFavoriteBoardingProfile(user: CurrentUserPayload, boardingProfileId: string): Promise<{
        message: string;
    }>;
    removeFavoriteBoardingProfile(user: CurrentUserPayload, boardingProfileId: string): Promise<{
        message: string;
    }>;
    getFavoriteProducts(user: CurrentUserPayload): Promise<Record<string, unknown>[]>;
    addFavoriteProduct(user: CurrentUserPayload, productId: string): Promise<{
        message: string;
    }>;
    removeFavoriteProduct(user: CurrentUserPayload, productId: string): Promise<{
        message: string;
    }>;
}
