import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderStatus, Role, ProductCategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

/**
 * Store service: products catalog, orders, checkout, order status, cancel.
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse imageUrls from JSON string to array if present.
   * @param product - The product with potential JSON string imageUrls
   * @returns Product with parsed imageUrls array
   */
  private parseProductImageUrls(product: Record<string, unknown>) {
    if (product && product.imageUrls != null) {
      try {
        if (typeof product.imageUrls === 'string') {
          const parsed = JSON.parse(product.imageUrls);
          product.imageUrls = Array.isArray(parsed) ? parsed : [parsed];
        } else if (!Array.isArray(product.imageUrls)) {
          product.imageUrls = [];
        }
      } catch {
        product.imageUrls = [];
      }
    } else {
      product.imageUrls = [];
    }
    return product;
  }

  /**
   * List products with optional filters (category, price, search) and pagination.
   * @param filters - Search filters (q, category, minPrice, maxPrice)
   * @param isActiveOnly - If true, only return active products
   * @param sortBy - Sort field: createdAt or price
   * @param sortOrder - asc or desc
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of products
   */
  async findAllProducts(
    filters: {
      q?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
    } = {},
    isActiveOnly = true,
    sortBy: 'createdAt' | 'price' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const where: Prisma.ProductWhereInput = {
        isActive: isActiveOnly,
      };
      if (filters.category) where.category = filters.category as ProductCategory;

      // Full-text search on name and description (case-insensitive partial match)
      if (filters.q?.trim()) {
        const term = filters.q.trim();
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ];
      }

      if (filters.minPrice != null || filters.maxPrice != null) {
        where.price = {};
        if (filters.minPrice != null) where.price.gte = filters.minPrice;
        if (filters.maxPrice != null) where.price.lte = filters.maxPrice;
      }

      const { take, skip } = getPaginationParams(limit, offset);
      const [data, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take,
          skip,
        }),
        this.prisma.product.count({ where }),
      ]);
      // Parse imageUrls for each product
      const parsedData = data.map((product) =>
        this.parseProductImageUrls(product as Record<string, unknown>),
      );
      return { data: parsedData, total, limit: take, offset: skip };
    } catch (error) {
      this.logger.error('FindAll products failed', error);
      throw error;
    }
  }

  /**
   * Get a single product by id.
   * @param id - The product ID
   * @returns The product
   * @throws NotFoundException if product not found
   */
  async findOneProduct(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });
      if (!product) throw new NotFoundException('Product not found');
      return this.parseProductImageUrls(product as Record<string, unknown>);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('FindOne product failed', error);
      throw error;
    }
  }

  /**
   * Create a new product (admin).
   * @param dto - Product data (name, price, stock, category, etc.)
   * @returns The created product
   */
  async createProduct(dto: CreateProductDto) {
    try {
      const category = dto.category as ProductCategory;
      const data = {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: Number(dto.price),
        stock: Math.max(0, Math.floor(Number(dto.stock))),
        category,
        imageUrl: dto.imageUrl?.trim() || null,
        imageUrls:
          Array.isArray(dto.imageUrls) && dto.imageUrls.length > 0
            ? JSON.stringify(dto.imageUrls)
            : null,
        isActive: dto.isActive ?? true,
      };
      const product = await this.prisma.product.create({ data });
      this.logger.log(`Product persisted: id=${product.id} name=${product.name}`);
      return this.parseProductImageUrls(product as Record<string, unknown>);
    } catch (error) {
      this.logger.error('Create product failed', error);
      throw error;
    }
  }

  /**
   * Update a product by id.
   * @param id - The product ID
   * @param dto - Fields to update
   * @returns The updated product
   * @throws NotFoundException if product not found
   */
  async updateProduct(id: string, dto: UpdateProductDto) {
    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (!product) throw new NotFoundException('Product not found');
      const data: Prisma.ProductUpdateInput = { ...dto } as Prisma.ProductUpdateInput;
      // Handle imageUrls array - convert to JSON string for storage
      const imageUrls = (dto as Record<string, unknown>).imageUrls as string[] | undefined;
      if (Array.isArray(imageUrls)) {
        data.imageUrls = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
      }
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data,
      });
      return this.parseProductImageUrls(updatedProduct as Record<string, unknown>);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Update product failed', error);
      throw error;
    }
  }

  /**
   * Delete a product by id.
   * @param id - The product ID
   * @returns Success message
   * @throws NotFoundException if product not found
   */
  async removeProduct(id: string) {
    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (!product) throw new NotFoundException('Product not found');
      await this.prisma.product.delete({ where: { id } });
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Remove product failed', error);
      throw error;
    }
  }

  /**
   * Create order and order items; decrements product stock. Payment not implemented — status PLACED.
   * @param userId - The user placing the order
   * @param dto - Cart items (productId, quantity per item)
   * @returns The created order with items and products
   * @throws BadRequestException if cart empty, product not found/inactive, or insufficient stock
   */
  async checkout(userId: string, dto: CheckoutDto) {
    try {
      if (!dto.items?.length) throw new BadRequestException('Cart is empty');
      const productIds = dto.items.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException(
          'One or more products not found or inactive',
        );
      }
      const productMap = new Map(products.map((p) => [p.id, p]));
      let total = 0;
      const orderItems: {
        productId: string;
        quantity: number;
        unitPrice: number;
      }[] = [];
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product)
          throw new BadRequestException(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          );
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
          data: { userId, total, status: OrderStatus.PLACED },
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
        return tx.order.findUnique({
          where: { id: newOrder.id },
          include: { items: { include: { product: true } } },
        });
      });
      return order;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Checkout failed', error);
      throw error;
    }
  }

  /**
   * Get orders for the current user (paginated).
   * @param userId - The user ID
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of orders with items and products
   */
  async myOrders(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const where = { userId };
      const { take, skip } = getPaginationParams(limit, offset);
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
    } catch (error) {
      this.logger.error('My orders failed', error);
      throw error;
    }
  }

  /**
   * Get all orders (admin). Paginated.
   * @param _role - Caller role (reserved for future filtering)
   * @param limit - Page size
   * @param offset - Items to skip
   * @returns Paginated list of orders with user and items
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- role reserved for future filtering
  async findAllOrders(
    _role: Role,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const { take, skip } = getPaginationParams(limit, offset);
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
    } catch (error) {
      this.logger.error('FindAll orders failed', error);
      throw error;
    }
  }

  /**
   * Update order status (admin). Enforces valid status transitions.
   * @param orderId - The order ID
   * @param status - New status (must be valid transition from current)
   * @returns The updated order with items
   * @throws NotFoundException if order not found
   * @throws BadRequestException if order delivered/cancelled or invalid transition
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.DELIVERED
      ) {
        throw new BadRequestException(
          'Cannot change status of delivered or cancelled orders',
        );
      }
      // Enforce a simple forward-only workflow
      const allowedNext: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PLACED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
        [OrderStatus.PAID]: [
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.PROCESSING]: [
          OrderStatus.SHIPPED,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
      };
      if (!allowedNext[order.status].includes(status)) {
        throw new BadRequestException(
          `Invalid status transition from ${order.status} to ${status}`,
        );
      }
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: { include: { product: true } } },
      });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Update order status failed', error);
      throw error;
    }
  }

  /**
   * Cancel an order (owner only). Not allowed if already shipped/delivered/cancelled.
   * @param userId - The current user ID
   * @param orderId - The order ID
   * @returns The cancelled order with items
   * @throws NotFoundException if order not found
   * @throws ForbiddenException if not the order owner
   * @throws BadRequestException if order cannot be cancelled
   */
  async cancelMyOrder(userId: string, orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own orders');
      }
      if (
        order.status === OrderStatus.SHIPPED ||
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'This order can no longer be cancelled',
        );
      }
      const cancelled = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { items: { include: { product: true } } },
      });
      return cancelled;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Cancel order failed', error);
      throw error;
    }
  }

  /**
   * Get revenue data for a specific product (by week for last 4 weeks).
   * @param productId - The product ID
   * @returns Revenue data with labels and values
   */
  async getProductRevenue(productId: string) {
    try {
      // Get all order items for this product
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

      // Filter only delivered/paid orders (completed sales)
      const validOrders = orderItems.filter(
        (item) =>
          item.order.status === OrderStatus.DELIVERED ||
          item.order.status === OrderStatus.PAID ||
          item.order.status === OrderStatus.SHIPPED,
      );

      // Calculate revenue by week (last 4 weeks)
      const now = new Date();
      const weeklyRevenue = new Array(4).fill(0);

      validOrders.forEach((item) => {
        const orderDate = new Date(item.order.createdAt);
        const weeksAgo = Math.floor(
          (now.getTime() - orderDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );

        if (weeksAgo >= 0 && weeksAgo < 4) {
          // Revenue = unitPrice * quantity
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
    } catch (error) {
      this.logger.error('Get product revenue failed', error);
      throw error;
    }
  }
}
