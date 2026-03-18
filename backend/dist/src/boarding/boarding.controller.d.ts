import { BoardingService } from './boarding.service';
import { CreateBoardingProfileDto } from './dto/create-boarding-profile.dto';
import { UpdateBoardingProfileDto } from './dto/update-boarding-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { AddBlackoutDateDto } from './dto/blackout-date.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SearchBoardingQueryDto } from './dto/search-boarding-query.dto';
export declare class BoardingController {
    private readonly boardingService;
    private readonly logger;
    constructor(boardingService: BoardingService);
    getMyProfile(user: CurrentUserPayload): Promise<{
        id: string;
        hostId: string;
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
        createdAt: Date;
        updatedAt: Date;
        averageRating: number;
        reviewCount: number;
        stats: {
            totalEarnings: number;
            totalBookings: number;
            pendingBookings: number;
            completedBookings: number;
        };
    }>;
    getProfileByHost(hostId: string, user: CurrentUserPayload): Promise<{
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
    } | null>;
    createProfile(dto: CreateBoardingProfileDto, user: CurrentUserPayload): Promise<{
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
    }>;
    search(query: SearchBoardingQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    myBookings(user: CurrentUserPayload, pagination?: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    updateBookingStatus(id: string, dto: UpdateBookingStatusDto, user: CurrentUserPayload): Promise<{
        boardingProfile: {
            host: {
                id: string;
                email: string;
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
        };
        owner: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        ownerId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        startDate: Date;
        endDate: Date;
        boardingProfileId: string;
    }>;
    createReview(id: string, dto: CreateReviewDto, user: CurrentUserPayload): Promise<{
        boardingProfile: {
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
        };
        booking: {
            id: string;
            createdAt: Date;
            ownerId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            startDate: Date;
            endDate: Date;
            boardingProfileId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        rating: number;
        comment: string | null;
        boardingProfileId: string;
        bookingId: string;
    }>;
    findOneProfile(id: string): Promise<{
        host: {
            id: string;
            name: string;
        };
        reviews: ({
            booking: {
                ownerId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            rating: number;
            comment: string | null;
            boardingProfileId: string;
            bookingId: string;
        })[];
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
    }>;
    approveProfile(id: string, isApproved: boolean, user: CurrentUserPayload): Promise<{
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
    } | {
        message: string;
    }>;
    updateProfile(id: string, dto: UpdateBoardingProfileDto, user: CurrentUserPayload): Promise<{
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
    }>;
    getBlackoutDates(id: string, user: CurrentUserPayload, startDate?: string, endDate?: string): Promise<{
        boardingProfileId: string;
    }[] | {
        id: string;
        boardingProfileId: string;
        date: Date;
    }[]>;
    addBlackout(id: string, dto: AddBlackoutDateDto, user: CurrentUserPayload): Promise<{
        id: string;
    }>;
    removeBlackout(id: string, date: string, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
    book(id: string, dto: CreateBookingDto, user: CurrentUserPayload): Promise<{
        boardingProfile: {
            host: {
                id: string;
                email: string;
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
        };
        owner: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        ownerId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        startDate: Date;
        endDate: Date;
        boardingProfileId: string;
    }>;
}
