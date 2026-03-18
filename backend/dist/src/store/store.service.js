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
var StoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const email_service_1 = require("../email/email.service");
let StoreService = StoreService_1 = class StoreService {
    prisma;
    emailService;
    logger = new common_1.Logger(StoreService_1.name);
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    parseProductImageUrls(product) {
        if (product && product.imageUrls != null) {
            try {
                if (typeof product.imageUrls === 'string') {
                    const parsed = JSON.parse(product.imageUrls);
                    product.imageUrls = Array.isArray(parsed) ? parsed : [parsed];
                }
                else if (!Array.isArray(product.imageUrls)) {
                    product.imageUrls = [];
                }
            }
            catch {
                product.imageUrls = [];
            }
        }
        else {
            product.imageUrls = [];
        }
        return product;
    }
    async findAllProducts(filters = {}, isActiveOnly = true, sortBy = 'createdAt', sortOrder = 'desc', limit, offset) {
        try {
            const where = {
                isActive: isActiveOnly,
            };
            if (filters.category)
                where.category = filters.category;
            if (filters.q?.trim()) {
                const term = filters.q.trim();
                where.OR = [
                    { name: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } },
                ];
            }
            if (filters.minPrice != null || filters.maxPrice != null) {
                where.price = {};
                if (filters.minPrice != null)
                    where.price.gte = filters.minPrice;
                if (filters.maxPrice != null)
                    where.price.lte = filters.maxPrice;
            }
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const [data, total] = await Promise.all([
                this.prisma.product.findMany({
                    where,
                    orderBy: { [sortBy]: sortOrder },
                    take,
                    skip,
                }),
                this.prisma.product.count({ where }),
            ]);
            const parsedData = data.map((product) => this.parseProductImageUrls(product));
            return { data: parsedData, total, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('FindAll products failed', error);
            throw error;
        }
    }
    async findOneProduct(id) {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id },
            });
            if (!product)
                throw new common_1.NotFoundException('Product not found');
            return this.parseProductImageUrls(product);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('FindOne product failed', error);
            throw error;
        }
    }
    async createProduct(dto) {
        try {
            const category = dto.category;
            const data = {
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                price: Number(dto.price),
                stock: Math.max(0, Math.floor(Number(dto.stock))),
                category,
                imageUrl: dto.imageUrl?.trim() || null,
                imageUrls: Array.isArray(dto.imageUrls) && dto.imageUrls.length > 0
                    ? JSON.stringify(dto.imageUrls)
                    : null,
                isActive: dto.isActive ?? true,
            };
            const product = await this.prisma.product.create({ data });
            this.logger.log(`Product persisted: id=${product.id} name=${product.name}`);
            return this.parseProductImageUrls(product);
        }
        catch (error) {
            this.logger.error('Create product failed', error);
            throw error;
        }
    }
    async updateProduct(id, dto) {
        try {
            const product = await this.prisma.product.findUnique({ where: { id } });
            if (!product)
                throw new common_1.NotFoundException('Product not found');
            const data = { ...dto };
            const imageUrls = dto.imageUrls;
            if (Array.isArray(imageUrls)) {
                data.imageUrls = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
            }
            const updatedProduct = await this.prisma.product.update({
                where: { id },
                data,
            });
            return this.parseProductImageUrls(updatedProduct);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Update product failed', error);
            throw error;
        }
    }
    async removeProduct(id) {
        try {
            const product = await this.prisma.product.findUnique({ where: { id } });
            if (!product)
                throw new common_1.NotFoundException('Product not found');
            await this.prisma.product.delete({ where: { id } });
            return { message: 'Product deleted successfully' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Remove product failed', error);
            throw error;
        }
    }
    async checkout(userId, dto) {
        try {
            if (!dto.items?.length)
                throw new common_1.BadRequestException('Cart is empty');
            const productIds = dto.items.map((i) => i.productId);
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds }, isActive: true },
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('One or more products not found or inactive');
            }
            const productMap = new Map(products.map((p) => [p.id, p]));
            let total = 0;
            const orderItems = [];
            for (const item of dto.items) {
                const product = productMap.get(item.productId);
                if (!product)
                    throw new common_1.BadRequestException(`Product ${item.productId} not found`);
                if (product.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
                }
                const unitPrice = product.price;
                total += unitPrice * item.quantity;
                orderItems.push({
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice,
                });
            }
            const order = await this.prisma.$transaction(async (tx) => {
                const newOrder = await tx.order.create({
                    data: { userId, total, status: client_1.OrderStatus.PLACED },
                });
                for (const item of orderItems) {
                    await tx.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                        },
                    });
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }
                const result = await tx.order.findUnique({
                    where: { id: newOrder.id },
                    include: {
                        items: { include: { product: true } },
                        user: { select: { email: true, name: true } }
                    },
                });
                return result;
            });
            if (order && order.user) {
                await this.emailService.sendOrderConfirmation({
                    email: order.user.email,
                    name: order.user.name,
                    orderId: order.id.slice(0, 8).toUpperCase(),
                    total: order.total,
                    items: order.items.map(item => ({
                        name: item.product.name,
                        quantity: item.quantity,
                        price: item.unitPrice
                    }))
                });
            }
            return order;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Checkout failed', error);
            throw error;
        }
    }
    async myOrders(userId, limit, offset) {
        try {
            const where = { userId };
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const [data, total] = await Promise.all([
                this.prisma.order.findMany({
                    where,
                    include: { items: { include: { product: true } } },
                    orderBy: { createdAt: 'desc' },
                    take,
                    skip,
                }),
                this.prisma.order.count({ where }),
            ]);
            return { data, total, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('My orders failed', error);
            throw error;
        }
    }
    async findAllOrders(_role, limit, offset) {
        try {
            const { take, skip } = (0, pagination_query_dto_1.getPaginationParams)(limit, offset);
            const [data, total] = await Promise.all([
                this.prisma.order.findMany({
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                        items: { include: { product: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take,
                    skip,
                }),
                this.prisma.order.count(),
            ]);
            return { data, total, limit: take, offset: skip };
        }
        catch (error) {
            this.logger.error('FindAll orders failed', error);
            throw error;
        }
    }
    async updateOrderStatus(orderId, status) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status === client_1.OrderStatus.CANCELLED ||
                order.status === client_1.OrderStatus.DELIVERED) {
                throw new common_1.BadRequestException('Cannot change status of delivered or cancelled orders');
            }
            const allowedNext = {
                [client_1.OrderStatus.PLACED]: [client_1.OrderStatus.PAID, client_1.OrderStatus.CANCELLED],
                [client_1.OrderStatus.PAID]: [
                    client_1.OrderStatus.PROCESSING,
                    client_1.OrderStatus.CANCELLED,
                ],
                [client_1.OrderStatus.PROCESSING]: [
                    client_1.OrderStatus.SHIPPED,
                    client_1.OrderStatus.CANCELLED,
                ],
                [client_1.OrderStatus.SHIPPED]: [client_1.OrderStatus.DELIVERED],
                [client_1.OrderStatus.DELIVERED]: [],
                [client_1.OrderStatus.CANCELLED]: [],
            };
            if (!allowedNext[order.status].includes(status)) {
                throw new common_1.BadRequestException(`Invalid status transition from ${order.status} to ${status}`);
            }
            const updated = await this.prisma.order.update({
                where: { id: orderId },
                data: { status },
                include: { items: { include: { product: true } } },
            });
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Update order status failed', error);
            throw error;
        }
    }
    async cancelMyOrder(userId, orderId) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.userId !== userId) {
                throw new common_1.ForbiddenException('You can only cancel your own orders');
            }
            if (order.status === client_1.OrderStatus.SHIPPED ||
                order.status === client_1.OrderStatus.DELIVERED ||
                order.status === client_1.OrderStatus.CANCELLED) {
                throw new common_1.BadRequestException('This order can no longer be cancelled');
            }
            const cancelled = await this.prisma.order.update({
                where: { id: orderId },
                data: { status: client_1.OrderStatus.CANCELLED },
                include: { items: { include: { product: true } } },
            });
            return cancelled;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.ForbiddenException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Cancel order failed', error);
            throw error;
        }
    }
    async getProductRevenue(productId) {
        try {
            const orderItems = await this.prisma.orderItem.findMany({
                where: { productId },
                include: {
                    order: {
                        select: {
                            createdAt: true,
                            status: true,
                        },
                    },
                },
            });
            const validOrders = orderItems.filter((item) => item.order.status === client_1.OrderStatus.DELIVERED ||
                item.order.status === client_1.OrderStatus.PAID ||
                item.order.status === client_1.OrderStatus.SHIPPED);
            const now = new Date();
            const weeklyRevenue = new Array(4).fill(0);
            validOrders.forEach((item) => {
                const orderDate = new Date(item.order.createdAt);
                const weeksAgo = Math.floor((now.getTime() - orderDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                if (weeksAgo >= 0 && weeksAgo < 4) {
                    weeklyRevenue[3 - weeksAgo] += item.unitPrice * item.quantity;
                }
            });
            return {
                productId,
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                data: weeklyRevenue,
                totalRevenue: weeklyRevenue.reduce((a, b) => a + b, 0),
                totalItemsSold: validOrders.reduce((sum, item) => sum + item.quantity, 0),
            };
        }
        catch (error) {
            this.logger.error('Get product revenue failed', error);
            throw error;
        }
    }
};
exports.StoreService = StoreService;
exports.StoreService = StoreService = StoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], StoreService);
//# sourceMappingURL=store.service.js.map