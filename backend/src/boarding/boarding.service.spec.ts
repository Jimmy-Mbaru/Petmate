import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { BoardingService } from './boarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockReportService } from '../block-report/block-report.service';
import { CreateBoardingProfileDto } from './dto/create-boarding-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateBoardingProfileDto } from './dto/update-boarding-profile.dto';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const otherUserId = '660e8400-e29b-41d4-a716-446655440001';
const mockProfileId = '770e8400-e29b-41d4-a716-446655440002';
const mockBookingId = '880e8400-e29b-41d4-a716-446655440003';
const mockReviewId = '990e8400-e29b-41d4-a716-446655440004';
const nonExistentId = '00000000-0000-0000-0000-000000000099';

describe('BoardingService', () => {
  let service: BoardingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockProfile = {
    id: mockProfileId,
    hostId: mockUserId,
    location: 'NYC',
    capacity: 2,
    pricePerDay: 50,
    description: null,
    isApproved: true,
    host: { id: mockUserId, name: 'Host' },
  };

  const mockBooking = {
    id: mockBookingId,
    ownerId: mockUserId,
    boardingProfileId: mockProfileId,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    status: BookingStatus.PENDING,
    createdAt: new Date(),
    boardingProfile: mockProfile,
    owner: { id: mockUserId, name: 'Owner' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      boardingProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      review: {
        create: jest.fn(),
      },
      blackoutDate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardingService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: BlockReportService,
          useValue: {
            isBlocked: jest.fn().mockResolvedValue(false),
            getBlockedUserIds: jest.fn().mockResolvedValue(new Set<string>()),
          },
        },
      ],
    }).compile();

    service = module.get<BoardingService>(BoardingService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const dto: CreateBoardingProfileDto = {
      location: 'NYC',
      capacity: 2,
      pricePerDay: 50,
    };

    it('should create boarding profile for host', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.boardingProfile.create as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.createProfile(mockUserId, dto);

      expect(result).toEqual(mockProfile);
      expect(prisma.boardingProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hostId: mockUserId,
          location: dto.location,
          capacity: dto.capacity,
          pricePerDay: dto.pricePerDay,
          description: undefined,
          photoUrls: [],
          documentUrls: [],
        }),
      });
    });

    it('should throw BadRequestException when host already has profile', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );

      await expect(service.createProfile(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createProfile(mockUserId, dto)).rejects.toThrow(
        'You already have a boarding profile',
      );
      expect(prisma.boardingProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return paginated approved profiles', async () => {
      (prisma.boardingProfile.findMany as jest.Mock).mockResolvedValue([
        mockProfile,
      ]);
      (prisma.boardingProfile.count as jest.Mock).mockResolvedValue(1);

      const result = await service.search({}, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.boardingProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isApproved: true },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should filter by q (location/description) when provided', async () => {
      (prisma.boardingProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.boardingProfile.count as jest.Mock).mockResolvedValue(0);

      await service.search({ q: 'NYC' }, 10, 0);

      expect(prisma.boardingProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isApproved: true,
            OR: expect.arrayContaining([
              expect.objectContaining({
                location: { contains: 'NYC', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOneProfile', () => {
    it('should return profile by id', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        reviews: [],
      });

      const result = await service.findOneProfile(mockProfileId);

      expect(result.id).toBe(mockProfileId);
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneProfile(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneProfile(nonExistentId)).rejects.toThrow(
        'Boarding profile not found',
      );
    });
  });

  describe('updateProfile', () => {
    const dto: UpdateBoardingProfileDto = { location: 'Boston' };

    it('should update profile when host matches', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.boardingProfile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        location: 'Boston',
      });

      const result = await service.updateProfile(mockProfileId, mockUserId, dto);

      expect(prisma.boardingProfile.update).toHaveBeenCalledWith({
        where: { id: mockProfileId },
        data: dto,
      });
    });

    it('should throw ForbiddenException when updating another host profile', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );

      await expect(service.updateProfile(mockProfileId, otherUserId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.updateProfile(mockProfileId, otherUserId, dto)).rejects.toThrow(
        'Not your profile',
      );
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile(nonExistentId, mockUserId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProfile(nonExistentId, mockUserId, dto)).rejects.toThrow(
        'Profile not found',
      );
    });
  });

  describe('book', () => {
    const dto: CreateBookingDto = {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    };

    it('should create booking for approved profile', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        host: { id: mockUserId },
      });
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.book(mockProfileId, mockUserId, dto);

      expect(result).toEqual(mockBooking);
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: mockUserId,
            boardingProfileId: mockProfileId,
            status: BookingStatus.PENDING,
          }),
        }),
      );
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.book(nonExistentId, mockUserId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when profile not approved', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        isApproved: false,
      });

      await expect(service.book(mockProfileId, mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.book(mockProfileId, mockUserId, dto)).rejects.toThrow(
        'Profile not approved yet',
      );
    });

    it('should throw BadRequestException when end date not after start date', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      const badDto: CreateBookingDto = {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() - 86400000).toISOString(),
      };

      await expect(service.book(mockProfileId, mockUserId, badDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.book(mockProfileId, mockUserId, badDto)).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should throw BadRequestException when dates overlap existing booking', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        host: { id: mockUserId },
        maxPetsPerNight: 1,
      });
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockBookingId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      ]);

      await expect(service.book(mockProfileId, mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.book(mockProfileId, mockUserId, dto)).rejects.toThrow(
        'Selected dates exceed capacity',
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('updateBookingStatus', () => {
    it('should update status when host owns profile', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        boardingProfile: mockProfile,
      });
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
      });

      const result = await service.updateBookingStatus(
        mockBookingId,
        mockUserId,
        BookingStatus.ACCEPTED,
      );

      expect(result.status).toBe(BookingStatus.ACCEPTED);
    });

    it('should throw ForbiddenException when not profile host', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        boardingProfile: mockProfile,
      });

      await expect(
        service.updateBookingStatus(mockBookingId, otherUserId, BookingStatus.ACCEPTED),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateBookingStatus(mockBookingId, otherUserId, BookingStatus.ACCEPTED),
      ).rejects.toThrow('Not your boarding profile');
    });

    it('should throw BadRequestException when booking already processed', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
        boardingProfile: mockProfile,
      });

      await expect(
        service.updateBookingStatus(mockBookingId, mockUserId, BookingStatus.ACCEPTED),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateBookingStatus(mockBookingId, mockUserId, BookingStatus.ACCEPTED),
      ).rejects.toThrow('Booking already processed');
    });
  });

  describe('myBookings', () => {
    it('should return owner bookings when role is OWNER', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(1);

      const result = await service.myBookings(mockUserId, Role.OWNER, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: mockUserId },
        }),
      );
    });

    it('should return empty when HOST has no profile', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.myBookings(mockUserId, Role.HOST, 20, 0);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('createReview', () => {
    const dto: CreateReviewDto = { rating: 5, comment: 'Great!' };

    it('should throw BadRequestException when booking not completed', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.PENDING,
        ownerId: mockUserId,
        review: null,
      });

      await expect(service.createReview(mockBookingId, mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(mockBookingId, mockUserId, dto)).rejects.toThrow(
        'Can only review completed bookings',
      );
    });

    it('should throw ForbiddenException when not booking owner', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        ownerId: mockUserId,
        review: null,
      });

      await expect(service.createReview(mockBookingId, otherUserId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createReview(mockBookingId, otherUserId, dto)).rejects.toThrow(
        'Not your booking',
      );
    });

    it('should create review when booking completed and owner', async () => {
      const completedBooking = {
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        ownerId: mockUserId,
        boardingProfileId: mockProfileId,
        review: null,
      };
      const createdReview = {
        id: mockReviewId,
        bookingId: mockBookingId,
        boardingProfileId: mockProfileId,
        rating: 5,
        comment: 'Great!',
        createdAt: new Date(),
      };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        completedBooking,
      );
      (prisma.review.create as jest.Mock).mockResolvedValue(createdReview);

      const result = await service.createReview(mockBookingId, mockUserId, dto);

      expect(result).toEqual(createdReview);
      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          bookingId: mockBookingId,
          boardingProfileId: mockProfileId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: { booking: true, boardingProfile: true },
      });
    });

    it('should throw BadRequestException when already reviewed', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        ownerId: mockUserId,
        review: { id: mockReviewId, rating: 5, comment: 'Done' },
      });

      await expect(service.createReview(mockBookingId, mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(mockBookingId, mockUserId, dto)).rejects.toThrow(
        'Already reviewed',
      );
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createReview(nonExistentId, mockUserId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createReview(nonExistentId, mockUserId, dto)).rejects.toThrow(
        'Booking not found',
      );
    });
  });

  describe('approveProfile', () => {
    it('should set isApproved to true', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue({
        ...mockProfile,
        isApproved: false,
      });
      (prisma.boardingProfile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        isApproved: true,
      });

      const result = await service.approveProfile(mockProfileId, mockUserId);

      expect(result.isApproved).toBe(true);
      expect(prisma.boardingProfile.update).toHaveBeenCalledWith({
        where: { id: mockProfileId },
        data: { isApproved: true },
      });
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (prisma.boardingProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.approveProfile(nonExistentId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
