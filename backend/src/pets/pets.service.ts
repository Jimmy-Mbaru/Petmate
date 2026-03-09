import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Pet, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { MATCHING_SCORE, MATCHING_LIMITS } from './constants/matching.constant';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

/**
 * A pet match result: candidate pet, match score, and explanation strings.
 */
export interface PetMatch {
  pet: Pet & { owner: { id: string; name: string } };
  score: number;
  explanations: string[];
}

/**
 * Pets service: CRUD for pets, list available, match pets by species/breed/age/gender.
 */
@Injectable()
export class PetsService {
  private readonly logger = new Logger(PetsService.name);

  constructor(private readonly prisma: PrismaService) {}
  /**
   * Create a new pet
   * @param ownerId - The ID of the owner of the pet
   * @param dto - The data for the pet
   * @returns The created pet
   */
  async create(ownerId: string, dto: CreatePetDto): Promise<Pet> {
    try {
      return this.prisma.pet.create({
        data: {
          ownerId,
          name: dto.name,
          species: dto.species,
          breed: dto.breed,
          age: dto.age,
          gender: dto.gender,
          healthNotes: dto.healthNotes,
          photoUrl: dto.photoUrl,
          photoUrls: dto.photoUrls ?? [],
          isAvailable: dto.isAvailable ?? true,
        },
      });
    } catch (error) {
      this.logger.error('Create pet failed', error);
      throw error;
    }
  }

  /**
   * Find all pets
   * @param species - The species of the pet
   * @param breed - The breed of the pet
   * @param limit - The limit of the pets
   * @param offset - The offset of the pets
   * @returns The paginated response of the pets
   */
  async findAll(
    species?: string,
    breed?: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Pet & { owner: { id: string; name: string } }>> {
    try {
      const where: Prisma.PetWhereInput = { isAvailable: true };
      if (species) where.species = species;
      if (breed) where.breed = breed;
      const { take, skip } = getPaginationParams(limit, offset);
      const [data, total] = await Promise.all([
        this.prisma.pet.findMany({
          where,
          include: {
            owner: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        this.prisma.pet.count({ where }),
      ]);
      return { data, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('FindAll pets failed', error);
      throw error;
    }
  }

  /**
   * Find pets owned by a user (paginated).
   */
  async findByOwner(
    ownerId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Pet & { owner: { id: string; name: string } }>> {
    const { take, skip } = getPaginationParams(limit, offset);
    const where: Prisma.PetWhereInput = { ownerId };
    const [data, total] = await Promise.all([
      this.prisma.pet.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.pet.count({ where }),
    ]);
    return { data, total, limit: take, offset: skip };
  }

  /**
   * Find a pet by ID
   * @param id - The ID of the pet
   * @returns The pet
   */
  async findOne(
    id: string,
  ): Promise<Pet & { owner: { id: string; name: string; email: string } }> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      if (!pet) throw new NotFoundException('Pet not found');
      return pet;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('FindOne pet failed', error);
      throw error;
    }
  }

  /**
   * Update a pet
   * @param id - The ID of the pet
   * @param ownerId - The ID of the owner of the pet
   * @param dto - The data for the pet
   * @returns The updated pet
   */
  async update(id: string, ownerId: string, dto: UpdatePetDto): Promise<Pet> {
    try {
      const pet = await this.prisma.pet.findUnique({ where: { id } });
      if (!pet) throw new NotFoundException('Pet not found');
      if (pet.ownerId !== ownerId) throw new ForbiddenException('Not your pet');
      return this.prisma.pet.update({
        where: { id },
        data: dto as Prisma.PetUpdateInput,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error('Update pet failed', error);
      throw error;
    }
  }

  /**
   * Remove a pet
   * @param id - The ID of the pet
   * @param ownerId - The ID of the owner of the pet
   * @returns The message of the deleted pet
   */
  async remove(id: string, ownerId: string): Promise<{ message: string }> {
    try {
      const pet = await this.prisma.pet.findUnique({ where: { id } });
      if (!pet) throw new NotFoundException('Pet not found');
      if (pet.ownerId !== ownerId) throw new ForbiddenException('Not your pet');
      await this.prisma.pet.delete({ where: { id } });
      return { message: 'Pet deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error('Remove pet failed', error);
      throw error;
    }
  }

  /**
   * Get matches for a pet (real DB via Prisma – no mocks).
   * Loads the pet and candidate pets from the database, scores by species/breed/age/gender, returns top N.
   * @param petId - The ID of the pet
   * @param options - Optional filters: similarBreed, verifiedOnly, activeOnly
   * @returns The matches for the pet
   */
  async getMatches(
    petId: string,
    options?: {
      similarBreed?: boolean;
      verifiedOnly?: boolean;
      activeOnly?: boolean;
    },
  ): Promise<PetMatch[]> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: { owner: true },
      });
      if (!pet) throw new NotFoundException('Pet not found');
      if (!pet.isAvailable)
        throw new ForbiddenException('Pet is not available for matching');

      const ownerWhere: Prisma.UserWhereInput = {};
      if (options?.verifiedOnly) ownerWhere.emailVerified = true;
      if (options?.activeOnly) {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        ownerWhere.lastSeenAt = { gte: ninetyDaysAgo };
      }

      const candidates = await this.prisma.pet.findMany({
        where: {
          id: { not: petId },
          isAvailable: true,
          ownerId: { not: pet.ownerId },
          ...(options?.similarBreed && { species: pet.species }),
          ...(Object.keys(ownerWhere).length > 0 && { owner: ownerWhere }),
        },
        include: {
          owner: { select: { id: true, name: true } },
        },
      });

      const scored: PetMatch[] = candidates.map((candidate) => {
        let score = 0;
        const explanations: string[] = [];

        if (candidate.species === pet.species) {
          if (candidate.breed === pet.breed) {
            score += MATCHING_SCORE.SAME_BREED;
            explanations.push(`Same breed (+${MATCHING_SCORE.SAME_BREED})`);
          } else {
            score += MATCHING_SCORE.SAME_SPECIES;
            explanations.push(`Same species (+${MATCHING_SCORE.SAME_SPECIES})`);
          }
        }

        const ageDiff = Math.abs(candidate.age - pet.age);
        if (ageDiff <= MATCHING_LIMITS.AGE_CLOSE_MONTHS) {
          score += MATCHING_SCORE.AGE_WITHIN_12_MONTHS;
          explanations.push(
            `Age within ${MATCHING_LIMITS.AGE_CLOSE_MONTHS} months (+${MATCHING_SCORE.AGE_WITHIN_12_MONTHS})`,
          );
        } else if (ageDiff <= MATCHING_LIMITS.AGE_MEDIUM_MONTHS) {
          score += MATCHING_SCORE.AGE_WITHIN_24_MONTHS;
          explanations.push(
            `Age within ${MATCHING_LIMITS.AGE_MEDIUM_MONTHS} months (+${MATCHING_SCORE.AGE_WITHIN_24_MONTHS})`,
          );
        }

        const oppositeGender =
          (pet.gender.toLowerCase() === 'male' &&
            candidate.gender.toLowerCase() === 'female') ||
          (pet.gender.toLowerCase() === 'female' &&
            candidate.gender.toLowerCase() === 'male');
        if (oppositeGender) {
          score += MATCHING_SCORE.OPPOSITE_GENDER;
          explanations.push(
            `Opposite gender (+${MATCHING_SCORE.OPPOSITE_GENDER})`,
          );
        }

        return {
          pet: candidate as Pet & { owner: { id: string; name: string } },
          score,
          explanations,
        };
      });

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, MATCHING_LIMITS.TOP_N);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error('GetMatches failed', error);
      throw error;
    }
  }
}
