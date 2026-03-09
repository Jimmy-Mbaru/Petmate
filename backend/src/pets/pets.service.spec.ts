import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PetsService } from './pets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

const mockOwnerId = '550e8400-e29b-41d4-a716-446655440000';
const otherOwnerId = '660e8400-e29b-41d4-a716-446655440001';
const mockPetId = '770e8400-e29b-41d4-a716-446655440002';
const nonExistentId = '00000000-0000-0000-0000-000000000099';

describe('PetsService', () => {
  let service: PetsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPet = {
    id: mockPetId,
    ownerId: mockOwnerId,
    name: 'Buddy',
    species: 'dog',
    breed: 'Labrador',
    age: 24,
    gender: 'male',
    healthNotes: null,
    photoUrl: null,
    isAvailable: true,
    createdAt: new Date(),
    owner: { id: mockOwnerId, name: 'Owner' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      pet: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PetsService>(PetsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreatePetDto = {
      name: 'Buddy',
      species: 'dog',
      breed: 'Labrador',
      age: 24,
      gender: 'male',
    };

    it('should create a pet for owner', async () => {
      (prisma.pet.create as jest.Mock).mockResolvedValue(mockPet);

      const result = await service.create(mockOwnerId, dto);

      expect(result).toEqual(mockPet);
      expect(prisma.pet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: mockOwnerId,
          name: dto.name,
          species: dto.species,
          breed: dto.breed,
          age: dto.age,
          gender: dto.gender,
          healthNotes: undefined,
          photoUrl: undefined,
          photoUrls: [],
          isAvailable: true,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated available pets', async () => {
      (prisma.pet.findMany as jest.Mock).mockResolvedValue([mockPet]);
      (prisma.pet.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(undefined, undefined, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isAvailable: true },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should filter by species and breed when provided', async () => {
      (prisma.pet.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pet.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('dog', 'Labrador', 10, 0);

      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isAvailable: true, species: 'dog', breed: 'Labrador' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return pet by id', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      const result = await service.findOne(mockPetId);

      expect(result).toEqual(mockPet);
    });

    it('should throw NotFoundException when pet does not exist', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow('Pet not found');
    });
  });

  describe('update', () => {
    const dto: UpdatePetDto = { name: 'Max' };

    it('should update pet when owner matches', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);
      (prisma.pet.update as jest.Mock).mockResolvedValue({
        ...mockPet,
        name: 'Max',
      });

      const result = await service.update(mockPetId, mockOwnerId, dto);

      expect(result.name).toBe('Max');
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: mockPetId },
        data: dto,
      });
    });

    it('should throw ForbiddenException when updating another user pet', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      await expect(service.update(mockPetId, otherOwnerId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(mockPetId, otherOwnerId, dto)).rejects.toThrow('Not your pet');
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pet does not exist', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(nonExistentId, mockOwnerId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete pet when owner matches', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);
      (prisma.pet.delete as jest.Mock).mockResolvedValue(mockPet);

      const result = await service.remove(mockPetId, mockOwnerId);

      expect(result).toEqual({ message: 'Pet deleted successfully' });
      expect(prisma.pet.delete).toHaveBeenCalledWith({ where: { id: mockPetId } });
    });

    it('should throw ForbiddenException when deleting another user pet', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(mockPet);

      await expect(service.remove(mockPetId, otherOwnerId)).rejects.toThrow(ForbiddenException);
      expect(prisma.pet.delete).not.toHaveBeenCalled();
    });
  });

  describe('getMatches', () => {
    it('should return top matches for available pet', async () => {
      const otherPetId = '880e8400-e29b-41d4-a716-446655440003';
      const candidate = {
        ...mockPet,
        id: otherPetId,
        ownerId: otherOwnerId,
        gender: 'female',
        owner: { id: otherOwnerId, name: 'Other' },
      };
      (prisma.pet.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPet)
        .mockResolvedValueOnce(mockPet);
      (prisma.pet.findMany as jest.Mock).mockResolvedValue([candidate]);

      const result = await service.getMatches(mockPetId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('pet');
        expect(result[0]).toHaveProperty('score');
        expect(result[0]).toHaveProperty('explanations');
      }
    });

    it('should throw NotFoundException when pet does not exist', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMatches(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when pet is not available', async () => {
      (prisma.pet.findUnique as jest.Mock).mockResolvedValue({
        ...mockPet,
        isAvailable: false,
      });

      await expect(service.getMatches(1)).rejects.toThrow(ForbiddenException);
      await expect(service.getMatches(1)).rejects.toThrow(
        'Pet is not available for matching',
      );
    });
  });
});
