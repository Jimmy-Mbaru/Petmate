export declare class CreateBoardingProfileDto {
    location: string;
    latitude?: number;
    longitude?: number;
    capacity: number;
    maxPetsPerNight?: number;
    pricePerDay: number;
    description?: string;
    photoUrls?: string[];
    documentUrls?: string[];
}
