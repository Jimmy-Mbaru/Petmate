import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';
import { CreateBoardingProfileDto } from './dto/create-boarding-profile.dto';
import { UpdateBoardingProfileDto } from './dto/update-boarding-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

/** Minimal type for BlackoutDate delegate when Prisma client is not regenerated */
interface BlackoutDateDelegate {
  findMany(args: {
    where: { date?: { gte?: Date; lte?: Date }; boardingProfileId?: string };
    select?: { boardingProfileId: true };
    distinct?: ['boardingProfileId'];
    orderBy?: { date: 'asc' };
  }): Promise<
    | { boardingProfileId: string }[]
    | { id: string; boardingProfileId: string; date: Date }[]
  >;
  findFirst(args: {
    where: { boardingProfileId: string; date: { gte: Date; lt: Date } };
  }): Promise<{ id: string } | null>;
  deleteMany(args: {
    where: { boardingProfileId: string; date: Date };
  }): Promise<unknown>;
  upsert(args: {
    where: {
      boardingProfileId_date: { boardingProfileId: string; date: Date };
    };
    create: { boardingProfileId: string; date: Date };
    update: object;
  }): Promise<{ id: string; boardingProfileId: string; date: Date }>;
}

/** Earth radius in km for Haversine formula */
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance in km between two points (lat/lng in degrees).
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

import { EmailService } from '../email/email.service';

/**
 * Boarding service: host profiles, search, bookings, reviews, approval.
 */
@Injectable()
export class BoardingService {
  private readonly logger = new Logger(BoardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReport: BlockReportService,
    private readonly emailService: EmailService,
  ) {}

  private get blackout(): BlackoutDateDelegate {
    return (this.prisma as unknown as { blackoutDate: BlackoutDateDelegate })
      .blackoutDate;
  }

  /**
   * Create a boarding profile for a host.
   * @param hostId - The ID of the host user
   * @param dto - Profile data (location, capacity, pricePerDay, etc.)
   * @returns The created boarding profile
   * @throws BadRequestException if host already has a profile
   */
  async createProfile(hostId: string, dto: CreateBoardingProfileDto) {
    try {
      const existing = await this.prisma.boardingProfile.findUnique({
        where: { hostId },
      });
      if (existing)
        throw new BadRequestException('You already have a boarding profile');
      const createData = {
        hostId,
        location: dto.location,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        capacity: dto.capacity,
        pricePerDay: dto.pricePerDay,
        description: dto.description ?? undefined,
        photoUrls: dto.photoUrls ?? [],
        documentUrls: dto.documentUrls ?? [],
        ...(dto.maxPetsPerNight != null && {
          maxPetsPerNight: dto.maxPetsPerNight,
        }),
      } satisfies Record<string, unknown>;
      return this.prisma.boardingProfile.create({
        data: createData as Prisma.BoardingProfileUncheckedCreateInput,
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Create boarding profile failed', error);
      throw error;
    }
  }

  /**
   * Search approved boarding profiles with optional filters (q, price, capacity, rating).
   * @param filters - Search filters (q, minPrice, maxPrice, minCapacity, minRating, etc.)
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of boarding profiles
   */
  async search(
    filters: {
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
    } = {},
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const where: Prisma.BoardingProfileWhereInput = {
        isApproved: true,
      };

      // Full-text search on location and description (case-insensitive partial match)
      if (filters.q?.trim()) {
        const term = filters.q.trim();
        where.OR = [
          { location: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ];
      }

      if (filters.minPrice != null || filters.maxPrice != null) {
        where.pricePerDay = {};
        if (filters.minPrice != null) where.pricePerDay.gte = filters.minPrice;
        if (filters.maxPrice != null) where.pricePerDay.lte = filters.maxPrice;
      }
      if (filters.minCapacity != null)
        where.capacity = { gte: filters.minCapacity };

      // Filter by minimum average rating: only include profiles with avg(reviews.rating) >= minRating
      if (filters.minRating != null) {
        const groups = await this.prisma.review.groupBy({
          by: ['boardingProfileId'],
          _avg: { rating: true },
          having: {
            rating: { _avg: { gte: filters.minRating } },
          },
        });
        const profileIds = groups.map((g) => g.boardingProfileId);
        if (profileIds.length === 0) {
          const { take, skip } = getPaginationParams(limit, offset);
          return { data: [], total: 0, limit: take, offset: skip };
        }
        where.id = { in: profileIds };
      }

      // Availability filter: exclude profiles with any blackout in [startDate, endDate]
      const hasDateFilter =
        filters.startDate != null &&
        filters.endDate != null &&
        filters.startDate.trim() !== '' &&
        filters.endDate.trim() !== '';
      if (hasDateFilter) {
        const startDay = new Date(filters.startDate!);
        startDay.setUTCHours(0, 0, 0, 0);
        const endDay = new Date(filters.endDate!);
        endDay.setUTCHours(23, 59, 59, 999);
        const profilesWithBlackout = await this.blackout.findMany({
          where: { date: { gte: startDay, lte: endDay } },
          select: { boardingProfileId: true },
          distinct: ['boardingProfileId'],
        });
        const ids = (
          profilesWithBlackout as { boardingProfileId: string }[]
        ).map((b) => b.boardingProfileId);
        const blackoutProfileIds = new Set<string>(ids);
        if (blackoutProfileIds.size > 0) {
          const existingIdFilter = where.id as { in?: string[] } | undefined;
          if (existingIdFilter && Array.isArray(existingIdFilter.in)) {
            where.id = {
              in: existingIdFilter.in.filter(
                (id) => !blackoutProfileIds.has(id),
              ),
            };
          } else {
            where.id = { notIn: [...blackoutProfileIds] };
          }
        }
      }

      // Geo distance filter: only profiles with lat/lng, then filter by Haversine
      const useDistanceFilter =
        filters.lat != null &&
        filters.lng != null &&
        filters.maxDistanceKm != null &&
        filters.maxDistanceKm > 0;
      if (useDistanceFilter) {
        where.latitude = { not: null };
        where.longitude = { not: null };
      }

      const { take, skip } = getPaginationParams(limit, offset);

      if (useDistanceFilter) {
        // Fetch candidates with coordinates (cap at 5000 for safety), filter by distance in memory, then paginate
        const maxCandidates = 5000;
        const candidates = await this.prisma.boardingProfile.findMany({
          where,
          include: { host: { select: { id: true, name: true } } },
          orderBy: { id: 'desc' },
          take: maxCandidates,
        });
        const lat = filters.lat!;
        const lng = filters.lng!;
        const maxKm = filters.maxDistanceKm!;
        const withDistance = candidates
          .filter((p) => {
            const km = haversineKm(lat, lng, p.latitude!, p.longitude!);
            return km <= maxKm;
          })
          .map((p) => ({
            ...p,
            distanceKm: haversineKm(lat, lng, p.latitude!, p.longitude!),
          }));
        const total = withDistance.length;
        const data = withDistance.slice(skip, skip + take);
        return { data, total, limit: take, offset: skip };
      }

      const [data, total] = await Promise.all([
        this.prisma.boardingProfile.findMany({
          where,
          include: { host: { select: { id: true, name: true } } },
          orderBy: { id: 'desc' },
          take,
          skip,
        }),
        this.prisma.boardingProfile.count({ where }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('Search boarding failed', error);
      throw error;
    }
  }

  /**
   * Get boarding profile by host ID.
   * @param hostId - The host user ID
   * @param currentUserId - The ID of the user making the request
   * @param currentUserRole - The role of the user making the request
   * @returns The boarding profile for the specified host
   * @throws ForbiddenException if non-host/non-admin tries to access
   * @throws NotFoundException if profile not found
   */
  async getProfileByHost(
    hostId: string,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    try {
      // Allow hosts to view their own profile, admins can view any
      if (currentUserId !== hostId && currentUserRole !== Role.ADMIN) {
        throw new ForbiddenException(
          'You can only view your own boarding profile',
        );
      }

      const profile = await this.prisma.boardingProfile.findUnique({
        where: { hostId },
      });

      return profile;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error('Get boarding profile by host ID failed', error);
      throw error;
    }
  }

  /**
   * Get current host's boarding profile with stats (reviews count, average rating, bookings stats).
   * @param hostId - The host user ID
   * @returns The boarding profile with stats
   * @throws NotFoundException if profile not found
   */
  async getMyProfile(hostId: string) {
    try {
      const profileWithRelations = await this.prisma.boardingProfile.findUnique({
        where: { hostId },
        include: {
          reviews: {
            select: { rating: true },
          },
          bookings: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              boardingProfile: {
                select: {
                  pricePerDay: true,
                },
              },
            },
          },
        },
      }) as any; // Type assertion to handle Prisma's complex include types

      if (!profileWithRelations) {
        throw new NotFoundException('Boarding profile not found');
      }

      const profile = profileWithRelations as {
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
        reviews: { rating: number }[];
        bookings: {
          id: string;
          status: string;
          startDate: Date;
          endDate: Date;
          boardingProfile: { pricePerDay: number };
        }[];
      };

      // Calculate average rating
      const averageRating =
        profile.reviews.length > 0
          ? profile.reviews.reduce((sum, r) => sum + r.rating, 0) / profile.reviews.length
          : 0;

      // Helper to calculate booking total price
      const getBookingTotal = (b: typeof profile.bookings[0]) => {
        const days = Math.ceil(
          (b.endDate.getTime() - b.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return days * b.boardingProfile.pricePerDay;
      };

      // Calculate total earnings from completed/accepted bookings
      const totalEarnings = profile.bookings
        .filter((b) => b.status === 'COMPLETED' || b.status === 'ACCEPTED')
        .reduce((sum, b) => sum + getBookingTotal(b), 0);

      // Count bookings by status
      const totalBookings = profile.bookings.length;
      const pendingBookings = profile.bookings.filter((b) => b.status === 'PENDING').length;
      const completedBookings = profile.bookings.filter((b) => b.status === 'COMPLETED').length;

      const reviewCount = profile.reviews.length;

      return {
        id: profile.id,
        hostId: profile.hostId,
        location: profile.location,
        capacity: profile.capacity,
        pricePerDay: profile.pricePerDay,
        description: profile.description,
        isApproved: profile.isApproved,
        documentUrls: profile.documentUrls,
        latitude: profile.latitude,
        longitude: profile.longitude,
        photoUrls: profile.photoUrls,
        maxPetsPerNight: profile.maxPetsPerNight,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount,
        stats: {
          totalEarnings,
          totalBookings,
          pendingBookings,
          completedBookings,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Get my profile failed', error);
      throw error;
    }
  }

  /**
   * Get a single boarding profile by id with host and reviews.
   * @param id - The boarding profile ID
   * @returns The boarding profile with host and reviews
   * @throws NotFoundException if profile not found
   */
  async findOneProfile(id: string) {
    try {
      const profile = await this.prisma.boardingProfile.findUnique({
        where: { id },
        include: {
          host: { select: { id: true, name: true } },
          reviews: {
            include: { booking: { select: { ownerId: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!profile) throw new NotFoundException('Boarding profile not found');
      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('FindOne boarding profile failed', error);
      throw error;
    }
  }

  /**
   * Update a boarding profile (host must own the profile).
   * @param id - The boarding profile ID
   * @param hostId - The ID of the host making the request
   * @param dto - Fields to update
   * @returns The updated boarding profile
   * @throws NotFoundException if profile not found
   * @throws ForbiddenException if not the profile owner
   */
  async updateProfile(
    id: string,
    hostId: string,
    dto: UpdateBoardingProfileDto,
  ) {
    try {
      const profile = await this.prisma.boardingProfile.findUnique({
        where: { id },
      });
      if (!profile) throw new NotFoundException('Profile not found');
      if (profile.hostId !== hostId)
        throw new ForbiddenException('Not your profile');
      return this.prisma.boardingProfile.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error('Update boarding profile failed', error);
      throw error;
    }
  }

  /**
   * Create a booking for an approved boarding profile (checks date overlap).
   * @param boardingProfileId - The boarding profile ID
   * @param ownerId - The ID of the owner making the booking
   * @param dto - Start and end dates (ISO)
   * @returns The created booking with profile and owner
   * @throws NotFoundException if profile not found
   * @throws BadRequestException if not approved, invalid dates, or dates overlap
   */
  async book(
    boardingProfileId: string,
    ownerId: string,
    dto: CreateBookingDto,
  ) {
    try {
      const profile = await this.prisma.boardingProfile.findUnique({
        where: { id: boardingProfileId },
        include: { host: { select: { id: true } } },
      });
      if (!profile) throw new NotFoundException('Boarding profile not found');
      if (!profile.isApproved)
        throw new BadRequestException('Profile not approved yet');
      const hostBlockedOwner = await this.blockReport.isBlocked(
        profile.host.id,
        ownerId,
      );
      const ownerBlockedHost = await this.blockReport.isBlocked(
        ownerId,
        profile.host.id,
      );
      if (hostBlockedOwner || ownerBlockedHost)
        throw new BadRequestException('Booking not available (blocked user).');
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start)
        throw new BadRequestException('End date must be after start date');
      // Normalize to date-only for blackout and per-night checks
      const startDay = new Date(start);
      startDay.setUTCHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setUTCHours(0, 0, 0, 0);
      const blackoutInRange = await this.blackout.findFirst({
        where: {
          boardingProfileId,
          date: { gte: startDay, lt: endDay },
        },
      });
      if (blackoutInRange) {
        throw new BadRequestException(
          'Selected dates include a blackout date for this host; please choose different dates.',
        );
      }
      const profileWithCapacity = profile as typeof profile & {
        maxPetsPerNight?: number | null;
      };
      const maxPerNight = profileWithCapacity.maxPetsPerNight ?? 1;
      const overlapping = await this.prisma.booking.findMany({
        where: {
          boardingProfileId,
          status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
          startDate: { lt: end },
          endDate: { gt: start },
        },
      });
      for (
        let d = new Date(startDay);
        d < endDay;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const day = new Date(d);
        day.setUTCHours(0, 0, 0, 0);
        const count =
          overlapping.filter(
            (b) =>
              day >= new Date(new Date(b.startDate).setUTCHours(0, 0, 0, 0)) &&
              day < new Date(new Date(b.endDate).setUTCHours(0, 0, 0, 0)),
          ).length + 1;
        if (count > maxPerNight) {
          throw new BadRequestException(
            `Selected dates exceed capacity (max ${maxPerNight} pets per night).`,
          );
        }
      }
      const booking = await this.prisma.booking.create({
        data: {
          ownerId,
          boardingProfileId,
          startDate: start,
          endDate: end,
          status: BookingStatus.PENDING,
        },
        include: {
          boardingProfile: {
            include: {
              host: { select: { id: true, email: true, name: true } },
            },
          },
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      this.logger.log(
        `New booking #${booking.id} created by owner ${booking.owner.email} for host ${booking.boardingProfile.host.email}`,
      );

      // Send initial booking email
      await this.emailService.sendBookingUpdate({
        email: booking.owner.email,
        name: booking.owner.name,
        bookingId: booking.id.slice(0, 8).toUpperCase(),
        status: 'PENDING',
        hostName: booking.boardingProfile.host.name,
        startDate: booking.startDate.toLocaleDateString(),
        endDate: booking.endDate.toLocaleDateString(),
      });

      return booking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error('Create booking failed', error);
      throw error;
    }
  }

  /**
   * Update booking status (accept/decline). Only the host of the profile may update.
   * @param bookingId - The booking ID
   * @param hostId - The ID of the host making the request
   * @param status - ACCEPTED or DECLINED
   * @returns The updated booking
   * @throws NotFoundException if booking not found
   * @throws ForbiddenException if not the profile host
   * @throws BadRequestException if booking already processed or invalid status
   */
  async updateBookingStatus(
    bookingId: string,
    hostId: string,
    status: BookingStatus,
  ) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { boardingProfile: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.boardingProfile.hostId !== hostId)
        throw new ForbiddenException('Not your boarding profile');
      if (booking.status !== BookingStatus.PENDING)
        throw new BadRequestException('Booking already processed');
      if (
        status !== BookingStatus.ACCEPTED &&
        status !== BookingStatus.DECLINED
      )
        throw new BadRequestException('Status must be ACCEPTED or DECLINED');
      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          boardingProfile: {
            include: {
              host: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });
      if (status === BookingStatus.ACCEPTED) {
        this.logger.log(
          `Booking #${updated.id} accepted by host ${updated.boardingProfile.host.email} (owner ${updated.owner.email})`,
        );
      } else if (status === BookingStatus.DECLINED) {
        this.logger.log(
          `Booking #${updated.id} declined by host ${updated.boardingProfile.host.email} (owner ${updated.owner.email})`,
        );
      }

      // Send status update email
      await this.emailService.sendBookingUpdate({
        email: updated.owner.email,
        name: updated.owner.name,
        bookingId: updated.id.slice(0, 8).toUpperCase(),
        status: updated.status,
        hostName: updated.boardingProfile.host.name,
        startDate: updated.startDate.toLocaleDateString(),
        endDate: updated.endDate.toLocaleDateString(),
      });

      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error('Update booking status failed', error);
      throw error;
    }
  }

  /**
   * Get bookings for the current user (as owner or as host).
   * @param userId - The current user ID
   * @param role - The user's role (OWNER sees their bookings, HOST sees bookings for their profile)
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of bookings
   */
  async myBookings(
    userId: string,
    role: Role,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const blockedIds = await this.blockReport.getBlockedUserIds(userId);
      const blockedArr = blockedIds.size ? Array.from(blockedIds) : [];
      const { take, skip } = getPaginationParams(limit, offset);
      if (role === Role.OWNER) {
        const where: Prisma.BookingWhereInput = {
          ownerId: userId,
          ...(blockedArr.length > 0
            ? { boardingProfile: { hostId: { notIn: blockedArr } } }
            : {}),
        };
        const [data, total] = await Promise.all([
          this.prisma.booking.findMany({
            where,
            include: {
              boardingProfile: {
                include: { host: { select: { id: true, name: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
          }),
          this.prisma.booking.count({ where }),
        ]);

        // Calculate total price for each booking
        const withTotalPrice = data.map((b) => {
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          const days = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          );
          const totalPrice = Math.max(1, days) * b.boardingProfile.pricePerDay;
          return { ...b, totalPrice };
        });

        return { data: withTotalPrice, total, limit: take, offset: skip };
      }
      if (role === Role.HOST) {
        const profile = await this.prisma.boardingProfile.findUnique({
          where: { hostId: userId },
        });
        if (!profile) return { data: [], total: 0, limit: take, offset: skip };
        const where: Prisma.BookingWhereInput = {
          boardingProfileId: profile.id,
          ...(blockedArr.length > 0 ? { ownerId: { notIn: blockedArr } } : {}),
        };
        const [data, total] = await Promise.all([
          this.prisma.booking.findMany({
            where,
            include: {
              owner: { select: { id: true, name: true } },
              boardingProfile: true,
            },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
          }),
          this.prisma.booking.count({ where }),
        ]);

        // Calculate total price for each booking
        const withTotalPrice = data.map((b) => {
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          const days = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          );
          const totalPrice = Math.max(1, days) * b.boardingProfile.pricePerDay;
          return { ...b, totalPrice };
        });

        return { data: withTotalPrice, total, limit: take, offset: skip };
      }
      return { data: [], total: 0, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('My bookings failed', error);
      throw error;
    }
  }

  /**
   * Create a review for a completed booking (owner only, one review per booking).
   * @param bookingId - The booking ID
   * @param ownerId - The ID of the owner making the review
   * @param dto - Rating (1–5) and optional comment
   * @returns The created review
   * @throws NotFoundException if booking not found
   * @throws ForbiddenException if not the booking owner
   * @throws BadRequestException if booking not completed or already reviewed
   */
  async createReview(bookingId: string, ownerId: string, dto: CreateReviewDto) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { review: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.ownerId !== ownerId)
        throw new ForbiddenException('Not your booking');
      if (booking.status !== BookingStatus.COMPLETED)
        throw new BadRequestException('Can only review completed bookings');
      if (booking.review) throw new BadRequestException('Already reviewed');
      return this.prisma.review.create({
        data: {
          bookingId,
          boardingProfileId: booking.boardingProfileId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: { booking: true, boardingProfile: true },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error('Create review failed', error);
      throw error;
    }
  }

  /**
   * Add a blackout date for a host's profile (host cannot accept bookings on this date).
   */
  async addBlackout(boardingProfileId: string, hostId: string, date: string) {
    const profile = await this.prisma.boardingProfile.findUnique({
      where: { id: boardingProfileId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.hostId !== hostId)
      throw new ForbiddenException('Not your boarding profile');
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    const existing = await this.blackout.findFirst({
      where: {
        boardingProfileId,
        date: { gte: d, lt: new Date(d.getTime() + 86400000) },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.blackoutDate.create({
      data: { boardingProfileId, date: d },
    });
  }

  /**
   * Remove a blackout date.
   */
  async removeBlackout(
    boardingProfileId: string,
    hostId: string,
    date: string,
  ) {
    const profile = await this.prisma.boardingProfile.findUnique({
      where: { id: boardingProfileId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.hostId !== hostId)
      throw new ForbiddenException('Not your boarding profile');
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    await this.prisma.blackoutDate.deleteMany({
      where: { boardingProfileId, date: d },
    });
    return { success: true };
  }

  /**
   * Get blackout dates for a profile. Any authenticated user can view, only host can modify.
   */
  async getBlackoutDates(
    boardingProfileId: string,
    hostId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const profile = await this.prisma.boardingProfile.findUnique({
      where: { id: boardingProfileId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    // Any authenticated user can view blackout dates (needed for booking)
    const where: {
      boardingProfileId: string;
      date?: { gte?: Date; lte?: Date };
    } = { boardingProfileId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate)
        where.date.gte = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0));
      if (endDate)
        where.date.lte = new Date(
          new Date(endDate).setUTCHours(23, 59, 59, 999),
        );
    }
    return this.blackout.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Approve or reject a boarding profile (admin only).
   * @param id - The boarding profile ID
   * @param _adminId - The ID of the admin (required by API, unused)
   * @param isApproved - Whether to approve (true) or reject (false)
   * @returns The updated boarding profile or deletion message
   * @throws NotFoundException if profile not found
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- adminId required by API
  async approveProfile(id: string, _adminId: string, isApproved: boolean = true) {
    try {
      const profile = await this.prisma.boardingProfile.findUnique({
        where: { id },
      });
      if (!profile) throw new NotFoundException('Profile not found');
      
      if (!isApproved) {
        await this.prisma.boardingProfile.delete({ where: { id } });
        return { message: 'Profile rejected and deleted' };
      }
      
      return await this.prisma.boardingProfile.update({
        where: { id },
        data: { isApproved: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Approve profile failed', error);
      throw error;
    }
  }
}
