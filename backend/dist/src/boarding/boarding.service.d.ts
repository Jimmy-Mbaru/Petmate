import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';
import { CreateBoardingProfileDto } from './dto/create-boarding-profile.dto';
import { UpdateBoardingProfileDto } from './dto/update-boarding-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus, Role } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { EmailService } from '../email/email.service';
export declare class BoardingService {
    private readonly prisma;
    private readonly blockReport;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, blockReport: BlockReportService, emailService: EmailService);
    private get blackout();
    createProfile(hostId: string, dto: CreateBoardingProfileDto): Promise<{
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
    search(filters?: {
        q?: string;
        minPrice?: number;
        maxPrice?: number;
        minCapacity?: number;
        minRating?: number;
        lat?: number;
        lng?: number;
        maxDistanceKm?: number;
        startDate?: string;
        endDate?: string;
    }, limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    getProfileByHost(hostId: string, currentUserId: string, currentUserRole: Role): Promise<{
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
    getMyProfile(hostId: string): Promise<{
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
    updateProfile(id: string, hostId: string, dto: UpdateBoardingProfileDto): Promise<{
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
    book(boardingProfileId: string, ownerId: string, dto: CreateBookingDto): Promise<{
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
    updateBookingStatus(bookingId: string, hostId: string, status: BookingStatus): Promise<{
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
    myBookings(userId: string, role: Role, limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    createReview(bookingId: string, ownerId: string, dto: CreateReviewDto): Promise<{
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
    addBlackout(boardingProfileId: string, hostId: string, date: string): Promise<{
        id: string;
    }>;
    removeBlackout(boardingProfileId: string, hostId: string, date: string): Promise<{
        success: boolean;
    }>;
    getBlackoutDates(boardingProfileId: string, hostId: string, startDate?: string, endDate?: string): Promise<{
        boardingProfileId: string;
    }[] | {
        id: string;
        boardingProfileId: string;
        date: Date;
    }[]>;
    approveProfile(id: string, _adminId: string, isApproved?: boolean): Promise<{
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
}
