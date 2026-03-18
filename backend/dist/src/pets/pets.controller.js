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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PetsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pets_service_1 = require("./pets.service");
const create_pet_dto_1 = require("./dto/create-pet.dto");
const update_pet_dto_1 = require("./dto/update-pet.dto");
const matches_query_dto_1 = require("./dto/matches-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let PetsController = PetsController_1 = class PetsController {
    petsService;
    logger = new common_1.Logger(PetsController_1.name);
    constructor(petsService) {
        this.petsService = petsService;
    }
    async create(dto, user) {
        try {
            this.logger.log(`Create pet requested by user ${user.id}: ${dto.name}`);
            const result = await this.petsService.create(user.id, dto);
            this.logger.log(`Pet created: id=${result.id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Create pet failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async findMyPets(user, pagination) {
        try {
            this.logger.debug(`FindMyPets requested by user ${user.id}`);
            return await this.petsService.findByOwner(user.id, pagination?.limit, pagination?.offset);
        }
        catch (error) {
            this.logger.error(`FindMyPets failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async findAll(species, breed, pagination) {
        try {
            if (species ?? breed) {
                this.logger.debug(`FindAll pets, filters: species=${species ?? '-'}, breed=${breed ?? '-'}`);
            }
            return await this.petsService.findAll(species, breed, pagination?.limit, pagination?.offset);
        }
        catch (error) {
            this.logger.error('FindAll pets failed', error?.stack);
            throw error;
        }
    }
    async findOne(id) {
        try {
            this.logger.debug(`FindOne pet requested: ${id}`);
            return await this.petsService.findOne(id);
        }
        catch (error) {
            this.logger.error(`FindOne pet failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async update(id, dto, user) {
        try {
            this.logger.log(`Update pet requested: ${id} by user ${user.id}`);
            return await this.petsService.update(id, user.id, dto);
        }
        catch (error) {
            this.logger.error(`Update pet failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async remove(id, user) {
        try {
            this.logger.log(`Delete pet requested: ${id} by user ${user.id}`);
            return await this.petsService.remove(id, user.id);
        }
        catch (error) {
            this.logger.error(`Delete pet failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async getMatches(id, query) {
        try {
            this.logger.debug(`GetMatches requested for pet: ${id}`, query);
            return await this.petsService.getMatches(id, {
                similarBreed: query.similarBreed,
                verifiedOnly: query.verifiedOnly,
                activeOnly: query.activeOnly,
            });
        }
        catch (error) {
            this.logger.error(`GetMatches failed for pet id: ${id}`, error?.stack);
            throw error;
        }
    }
};
exports.PetsController = PetsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.OWNER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create pet (Owner)' }),
    (0, swagger_1.ApiBody)({ type: create_pet_dto_1.CreatePetDto, description: 'Pet profile data' }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pet_dto_1.CreatePetDto, Object]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.OWNER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'My pets (Owner), paginated' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of current user pets (data, total, limit, offset)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "findMyPets", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Browse available pets (paginated)' }),
    (0, swagger_1.ApiQuery)({
        name: 'species',
        required: false,
        description: 'Filter by species (e.g. dog, cat)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'breed', required: false, description: 'Filter by breed' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of available pets (data, total, limit, offset)' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Query)('species')),
    __param(1, (0, common_1.Query)('breed')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Pet detail' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pet details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update own pet' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Pet ID' }),
    (0, swagger_1.ApiBody)({ type: update_pet_dto_1.UpdatePetDto }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pet_dto_1.UpdatePetDto, Object]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete own pet' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pet deleted successfully' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/matches'),
    (0, swagger_1.ApiOperation)({ summary: 'AI matching: compatible pets for this pet' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Pet ID' }),
    (0, swagger_1.ApiQuery)({ name: 'similarBreed', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'verifiedOnly', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'activeOnly', required: false, type: Boolean }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Top 10 compatible pets with score and explanations',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Pet not available for matching' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, matches_query_dto_1.MatchesQueryDto]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "getMatches", null);
exports.PetsController = PetsController = PetsController_1 = __decorate([
    (0, swagger_1.ApiTags)('pets'),
    (0, common_1.Controller)('pets'),
    __metadata("design:paramtypes", [pets_service_1.PetsService])
], PetsController);
//# sourceMappingURL=pets.controller.js.map