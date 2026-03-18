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
var FavoritesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const favorites_service_1 = require("./favorites.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let FavoritesController = FavoritesController_1 = class FavoritesController {
    favoritesService;
    logger = new common_1.Logger(FavoritesController_1.name);
    constructor(favoritesService) {
        this.favoritesService = favoritesService;
    }
    async getFavoritePets(user) {
        return await this.favoritesService.getFavoritePets(user.id);
    }
    async addFavoritePet(user, petId) {
        return await this.favoritesService.addFavoritePet(user.id, petId);
    }
    async removeFavoritePet(user, petId) {
        return await this.favoritesService.removeFavoritePet(user.id, petId);
    }
    async getFavoriteBoardingProfiles(user) {
        return await this.favoritesService.getFavoriteBoardingProfiles(user.id);
    }
    async addFavoriteBoardingProfile(user, boardingProfileId) {
        return await this.favoritesService.addFavoriteBoardingProfile(user.id, boardingProfileId);
    }
    async removeFavoriteBoardingProfile(user, boardingProfileId) {
        return await this.favoritesService.removeFavoriteBoardingProfile(user.id, boardingProfileId);
    }
    async getFavoriteProducts(user) {
        return await this.favoritesService.getFavoriteProducts(user.id);
    }
    async addFavoriteProduct(user, productId) {
        return await this.favoritesService.addFavoriteProduct(user.id, productId);
    }
    async removeFavoriteProduct(user, productId) {
        return await this.favoritesService.removeFavoriteProduct(user.id, productId);
    }
};
exports.FavoritesController = FavoritesController;
__decorate([
    (0, common_1.Get)('pets'),
    (0, swagger_1.ApiOperation)({ summary: 'List favorite pets' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of favorite pets with owner' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "getFavoritePets", null);
__decorate([
    (0, common_1.Post)('pets/:petId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add pet to favorites' }),
    (0, swagger_1.ApiParam)({ name: 'petId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Pet added to favorites' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "addFavoritePet", null);
__decorate([
    (0, common_1.Delete)('pets/:petId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove pet from favorites' }),
    (0, swagger_1.ApiParam)({ name: 'petId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pet removed from favorites' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "removeFavoritePet", null);
__decorate([
    (0, common_1.Get)('boarding'),
    (0, swagger_1.ApiOperation)({ summary: 'List favorite boarding profiles (saved hosts)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of favorite boarding profiles' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "getFavoriteBoardingProfiles", null);
__decorate([
    (0, common_1.Post)('boarding/:boardingProfileId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add boarding profile to favorites' }),
    (0, swagger_1.ApiParam)({ name: 'boardingProfileId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Boarding profile added to favorites' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('boardingProfileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "addFavoriteBoardingProfile", null);
__decorate([
    (0, common_1.Delete)('boarding/:boardingProfileId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove boarding profile from favorites' }),
    (0, swagger_1.ApiParam)({ name: 'boardingProfileId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Boarding profile removed from favorites' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('boardingProfileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "removeFavoriteBoardingProfile", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'List favorite products (wishlist)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of favorite products' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "getFavoriteProducts", null);
__decorate([
    (0, common_1.Post)('products/:productId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add product to wishlist' }),
    (0, swagger_1.ApiParam)({ name: 'productId', type: String }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Product added to wishlist' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "addFavoriteProduct", null);
__decorate([
    (0, common_1.Delete)('products/:productId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove product from wishlist' }),
    (0, swagger_1.ApiParam)({ name: 'productId', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product removed from wishlist' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "removeFavoriteProduct", null);
exports.FavoritesController = FavoritesController = FavoritesController_1 = __decorate([
    (0, swagger_1.ApiTags)('favorites'),
    (0, common_1.Controller)('favorites'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [favorites_service_1.FavoritesService])
], FavoritesController);
//# sourceMappingURL=favorites.controller.js.map