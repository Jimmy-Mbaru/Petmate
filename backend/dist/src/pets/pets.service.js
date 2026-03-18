"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const matching_constant_1 = require("./constants/matching.constant");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
let PetsService = PetsService_1 = class PetsService {
    prisma;
    logger = new common_1.Logger(PetsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(ownerId, dto) {
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
        }
        catch (error) {
            this.logger.error('Create pet failed', error);
            throw error;
        }
    }
    async findAll(species, breed, limit, offset) {
        try {
            const where = { isAvailable: true };
            if (species)
                where.species = species;
            if (breed)
                where.breed = breed;
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
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
        catch (error) {
            this.logger.error('FindAll pets failed', error);
            throw error;
        }
    }
    async findByOwner(ownerId, limit, offset) {
        const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
        const where = { ownerId };
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
    async findOne(id) {
        try {
            const pet = await this.prisma.pet.findUnique({
                where: { id },
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                },
            });
            if (!pet)
                throw new common_1.NotFoundException('Pet not found');
            return pet;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('FindOne pet failed', error);
            throw error;
        }
    }
    async update(id, ownerId, dto) {
        try {
            const pet = await this.prisma.pet.findUnique({ where: { id } });
            if (!pet)
                throw new common_1.NotFoundException('Pet not found');
            if (pet.ownerId !== ownerId)
                throw new common_1.ForbiddenException('Not your pet');
            return this.prisma.pet.update({
                where: { id },
                data: dto,
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('Update pet failed', error);
            throw error;
        }
    }
    async remove(id, ownerId) {
        try {
            const pet = await this.prisma.pet.findUnique({ where: { id } });
            if (!pet)
                throw new common_1.NotFoundException('Pet not found');
            if (pet.ownerId !== ownerId)
                throw new common_1.ForbiddenException('Not your pet');
            await this.prisma.pet.delete({ where: { id } });
            return { message: 'Pet deleted successfully' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('Remove pet failed', error);
            throw error;
        }
    }
    async getMatches(petId, options) {
        try {
            const pet = await this.prisma.pet.findUnique({
                where: { id: petId },
                include: { owner: true },
            });
            if (!pet)
                throw new common_1.NotFoundException('Pet not found');
            if (!pet.isAvailable)
                throw new common_1.ForbiddenException('Pet is not available for matching');
            const ownerWhere = {};
            if (options?.verifiedOnly)
                ownerWhere.emailVerified = true;
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
            const scored = candidates.map((candidate) => {
                let score = 0;
                const explanations = [];
                if (candidate.species === pet.species) {
                    if (candidate.breed === pet.breed) {
                        score += matching_constant_1.MATCHING_SCORE.SAME_BREED;
                        explanations.push(`Same breed (+${matching_constant_1.MATCHING_SCORE.SAME_BREED})`);
                    }
                    else {
                        score += matching_constant_1.MATCHING_SCORE.SAME_SPECIES;
                        explanations.push(`Same species (+${matching_constant_1.MATCHING_SCORE.SAME_SPECIES})`);
                    }
                }
                const ageDiff = Math.abs(candidate.age - pet.age);
                if (ageDiff <= matching_constant_1.MATCHING_LIMITS.AGE_CLOSE_MONTHS) {
                    score += matching_constant_1.MATCHING_SCORE.AGE_WITHIN_12_MONTHS;
                    explanations.push(`Age within ${matching_constant_1.MATCHING_LIMITS.AGE_CLOSE_MONTHS} months (+${matching_constant_1.MATCHING_SCORE.AGE_WITHIN_12_MONTHS})`);
                }
                else if (ageDiff <= matching_constant_1.MATCHING_LIMITS.AGE_MEDIUM_MONTHS) {
                    score += matching_constant_1.MATCHING_SCORE.AGE_WITHIN_24_MONTHS;
                    explanations.push(`Age within ${matching_constant_1.MATCHING_LIMITS.AGE_MEDIUM_MONTHS} months (+${matching_constant_1.MATCHING_SCORE.AGE_WITHIN_24_MONTHS})`);
                }
                const oppositeGender = (pet.gender.toLowerCase() === 'male' &&
                    candidate.gender.toLowerCase() === 'female') ||
                    (pet.gender.toLowerCase() === 'female' &&
                        candidate.gender.toLowerCase() === 'male');
                if (oppositeGender) {
                    score += matching_constant_1.MATCHING_SCORE.OPPOSITE_GENDER;
                    explanations.push(`Opposite gender (+${matching_constant_1.MATCHING_SCORE.OPPOSITE_GENDER})`);
                }
                return {
                    pet: candidate,
                    score,
                    explanations,
                };
            });
            return scored
                .sort((a, b) => b.score - a.score)
                .slice(0, matching_constant_1.MATCHING_LIMITS.TOP_N);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException)
                throw error;
            this.logger.error('GetMatches failed', error);
            throw error;
        }
    }
};
exports.PetsService = PetsService;
exports.PetsService = PetsService = PetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PetsService);
//# sourceMappingURL=pets.service.js.map