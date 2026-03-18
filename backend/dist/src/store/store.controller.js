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
var StoreController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const store_service_1 = require("./store.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const checkout_dto_1 = require("./dto/checkout.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const verified_email_guard_1 = require("../auth/guards/verified-email.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const products_list_query_dto_1 = require("./dto/products-list-query.dto");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
let StoreController = StoreController_1 = class StoreController {
    storeService;
    logger = new common_1.Logger(StoreController_1.name);
    constructor(storeService) {
        this.storeService = storeService;
    }
    async findAllProducts(query) {
        try {
            this.logger.debug(`FindAll products requested, q=${query?.q}, category=${query?.category}, sortBy=${query?.sortBy}`);
            return await this.storeService.findAllProducts({
                q: query?.q,
                category: query?.category,
                minPrice: query?.minPrice,
                maxPrice: query?.maxPrice,
            }, true, query?.sortBy ?? 'createdAt', query?.sortOrder ?? 'desc', query?.limit, query?.offset);
        }
        catch (error) {
            this.logger.error('FindAll products failed', error?.stack);
            throw error;
        }
    }
    async findOneProduct(id) {
        try {
            this.logger.debug(`FindOne product requested: ${id}`);
            return await this.storeService.findOneProduct(id);
        }
        catch (error) {
            this.logger.error(`FindOne product failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async createProduct(dto) {
        try {
            this.logger.log(`Create product requested: ${dto.name}`, {
                name: dto.name,
                price: dto.price,
                stock: dto.stock,
                category: dto.category,
                imageUrls: dto.imageUrls,
                imageUrl: dto.imageUrl,
            });
            const result = await this.storeService.createProduct(dto);
            this.logger.log(`Product created: id=${result.id} name=${result.name}`, {
                id: result.id,
                imageUrls: result.imageUrls,
            });
            return result;
        }
        catch (error) {
            this.logger.error('Create product failed', error?.stack);
            throw error;
        }
    }
    async updateProduct(id, dto) {
        try {
            this.logger.log(`Update product requested: ${id}`);
            return await this.storeService.updateProduct(id, dto);
        }
        catch (error) {
            this.logger.error(`Update product failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async removeProduct(id) {
        try {
            this.logger.log(`Delete product requested: ${id}`);
            return await this.storeService.removeProduct(id);
        }
        catch (error) {
            this.logger.error(`Delete product failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async checkout(dto, user) {
        try {
            this.logger.log(`Checkout requested by user ${user.id}, items: ${dto.items?.length ?? 0}`);
            const result = await this.storeService.checkout(user.id, dto);
            this.logger.log(`Order created: id=${result?.id} for user ${user.id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Checkout failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async myOrders(user, pagination) {
        try {
            this.logger.debug(`My orders requested by user ${user.id}`);
            return await this.storeService.myOrders(user.id, pagination?.limit, pagination?.offset);
        }
        catch (error) {
            this.logger.error(`My orders failed for user ${user.id}`, error?.stack);
            throw error;
        }
    }
    async findAllOrders(user, pagination) {
        try {
            this.logger.debug(`FindAll orders requested by admin ${user.id}`);
            return await this.storeService.findAllOrders(user.role, pagination?.limit, pagination?.offset);
        }
        catch (error) {
            this.logger.error('FindAll orders failed', error?.stack);
            throw error;
        }
    }
    async updateOrderStatus(id, dto) {
        try {
            this.logger.log(`Update order status requested: order ${id} to ${dto.status}`);
            return await this.storeService.updateOrderStatus(id, dto.status);
        }
        catch (error) {
            this.logger.error(`Update order status failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async cancelMyOrder(id, user) {
        try {
            this.logger.log(`Cancel order requested: order ${id} by user ${user.id}`);
            return await this.storeService.cancelMyOrder(user.id, id);
        }
        catch (error) {
            this.logger.error(`Cancel order failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
    async getProductRevenue(id) {
        try {
            this.logger.debug(`Product revenue requested for id: ${id}`);
            return await this.storeService.getProductRevenue(id);
        }
        catch (error) {
            this.logger.error(`Product revenue failed for id: ${id}`, error?.stack);
            throw error;
        }
    }
};
exports.StoreController = StoreController;
__decorate([
    (0, common_1.Get)('products'),
    (0, throttler_1.SkipThrottle)({ default: true }),
    (0, swagger_1.ApiOperation)({
        summary: 'Search & discover products (public), paginated',
        description: 'Full-text search on name/description; filters: category, price range; sort by createdAt or price.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'q',
        required: false,
        description: 'Full-text search on product name and description',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        required: false,
        description: 'Filter by category',
    }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        description: 'Sort by field: createdAt or price',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        description: 'Sort order: asc or desc',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of active products (data, total, limit, offset)' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    (0, common_1.Header)('Cache-Control', 'public, max-age=60'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [products_list_query_dto_1.ProductsListQueryDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "findAllProducts", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    (0, throttler_1.SkipThrottle)({ default: true }),
    (0, swagger_1.ApiOperation)({ summary: 'Product detail' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Product ID (UUID)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Product not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "findOneProduct", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin adds product' }),
    (0, swagger_1.ApiBody)({ type: create_product_dto_1.CreateProductDto }),
    (0, api_responses_decorator_1.ApiResponsesCreate)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin updates product' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Product ID (UUID)' }),
    (0, swagger_1.ApiBody)({ type: update_product_dto_1.UpdateProductDto }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin removes product' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Product ID (UUID)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product deleted successfully' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "removeProduct", null);
__decorate([
    (0, common_1.Post)('cart/checkout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, verified_email_guard_1.VerifiedEmailGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Place order (cart checkout)',
        description: 'Creates order and order items; inventory is decremented. Payment integration (e.g. Stripe) is not yet implemented — order is created with status PLACED, payment TBD.',
    }),
    (0, swagger_1.ApiBody)({
        type: checkout_dto_1.CheckoutDto,
        description: 'Cart items: productId and quantity per item',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Order created with items (payment TBD)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [checkout_dto_1.CheckoutDto, Object]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "checkout", null);
__decorate([
    (0, common_1.Get)('orders/my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "User's order history (paginated)" }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of user orders (data, total, limit, offset)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "myOrders", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin views all orders (paginated)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Items to skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of all orders (data, total, limit, offset)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "findAllOrders", null);
__decorate([
    (0, common_1.Patch)('orders/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin updates order status' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Order ID (UUID)' }),
    (0, swagger_1.ApiBody)({ type: update_order_status_dto_1.UpdateOrderStatusDto }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.UpdateOrderStatusDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.Patch)('orders/:id/cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, verified_email_guard_1.VerifiedEmailGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'User cancels own order (if allowed)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Order ID (UUID)' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "cancelMyOrder", null);
__decorate([
    (0, common_1.Get)('products/:id/revenue'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get product revenue data (admin)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String, description: 'Product ID (UUID)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Product revenue data by week/month' }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "getProductRevenue", null);
exports.StoreController = StoreController = StoreController_1 = __decorate([
    (0, swagger_1.ApiTags)('store'),
    (0, common_1.Controller)('store'),
    __metadata("design:paramtypes", [store_service_1.StoreService])
], StoreController);
//# sourceMappingURL=store.controller.js.map