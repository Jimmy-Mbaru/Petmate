import { Pet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
export interface PetMatch {
    pet: Pet & {
        owner: {
            id: string;
            name: string;
        };
    };
    score: number;
    explanations: string[];
}
export declare class PetsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(ownerId: string, dto: CreatePetDto): Promise<Pet>;
    findAll(species?: string, breed?: string, limit?: number, offset?: number): Promise<PaginatedResponse<Pet & {
        owner: {
            id: string;
            name: string;
        };
    }>>;
    findByOwner(ownerId: string, limit?: number, offset?: number): Promise<PaginatedResponse<Pet & {
        owner: {
            id: string;
            name: string;
        };
    }>>;
    findOne(id: string): Promise<Pet & {
        owner: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    update(id: string, ownerId: string, dto: UpdatePetDto): Promise<Pet>;
    remove(id: string, ownerId: string): Promise<{
        message: string;
    }>;
    getMatches(petId: string, options?: {
        similarBreed?: boolean;
        verifiedOnly?: boolean;
        activeOnly?: boolean;
    }): Promise<PetMatch[]>;
}
