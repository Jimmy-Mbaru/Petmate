import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { MatchesQueryDto } from './dto/matches-query.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
export declare class PetsController {
    private readonly petsService;
    private readonly logger;
    constructor(petsService: PetsService);
    create(dto: CreatePetDto, user: CurrentUserPayload): Promise<{
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
    }>;
    findMyPets(user: CurrentUserPayload, pagination?: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<{
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
    } & {
        owner: {
            id: string;
            name: string;
        };
    }>>;
    findAll(species?: string, breed?: string, pagination?: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<{
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
    } & {
        owner: {
            id: string;
            name: string;
        };
    }>>;
    findOne(id: string): Promise<{
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
    } & {
        owner: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    update(id: string, dto: UpdatePetDto, user: CurrentUserPayload): Promise<{
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
    }>;
    remove(id: string, user: CurrentUserPayload): Promise<{
        message: string;
    }>;
    getMatches(id: string, query: MatchesQueryDto): Promise<import("./pets.service").PetMatch[]>;
}
