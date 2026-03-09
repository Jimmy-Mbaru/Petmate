import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { StoreService } from './store.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CheckoutDto } from './dto/checkout.dto';

describe('StoreService', () => {
  let service: StoreService;
  let prisma: jest.Mocked<PrismaService>;
  let mockTx: {
    order: { create: jest.Mock; findUnique: jest.Mock };
    orderItem: { create: jest.Mock };
    product: { update: jest.Mock; findMany: jest.Mock };
  };

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProductId = '660e8400-e29b-41d4-a716-446655440001';
  const mockOrderId = '770e8400-e29b-41d4-a716-446655440002';

  const mockProduct = {
    id: mockProductId,
    name: 'Treats',
    description: null,
    price: 10,
    stock: 100,
    category: 'food',
    imageUrl: null,
    isActive: true,
  };

  const mockOrder = {
    id: mockOrderId,
    userId: mockUserId,
    total: 20,
    status: 'PLACED',
    createdAt: new Date(),
    items: [
      {
        productId: mockProductId,
        quantity: 2,
        unitPrice: 10,
        product: { ...mockProduct, id: mockProductId },
      },
    ],
  };

  beforeEach(async () => {
    mockTx = {
      order: { create: jest.fn(), findUnique: jest.fn() },
      orderItem: { create: jest.fn() },
      product: { update: jest.fn(), findMany: jest.fn() },
    };
    const mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
        return fn(mockTx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jest.clearAllMocks();
  });

  describe('findAllProducts', () => {
    it('should return paginated active products', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAllProducts(
        {},
        true,
        'createdAt',
        'desc',
        20,
        0,
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should filter by category when provided', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await service.findAllProducts(
        { category: 'food' },
        true,
        'createdAt',
        'desc',
        10,
        0,
      );

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'food', isActive: true },
        }),
      );
    });
  });

  describe('findOneProduct', () => {
    it('should return product by id', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findOneProduct(mockProductId);

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneProduct('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneProduct('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('createProduct', () => {
    const dto: CreateProductDto = {
      name: 'Treats',
      price: 10,
      stock: 100,
      category: 'food',
    };

    it('should create product', async () => {
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.createProduct(dto);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          price: dto.price,
          stock: dto.stock,
          category: dto.category,
          isActive: true,
        }),
      });
    });
  });

  describe('updateProduct', () => {
    const dto: UpdateProductDto = { name: 'Premium Treats' };

    it('should update product', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        name: 'Premium Treats',
      });

      const result = await service.updateProduct(mockProductId, dto);

      expect(result.name).toBe('Premium Treats');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: dto,
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProduct('00000000-0000-0000-0000-000000000000', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeProduct', () => {
    it('should delete product', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.delete as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.removeProduct(mockProductId);

      expect(result).toEqual({ message: 'Product deleted successfully' });
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: mockProductId } });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removeProduct('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkout', () => {
    const dto: CheckoutDto = {
      items: [{ productId: mockProductId, quantity: 2 }],
    };

    it('should throw BadRequestException when cart is empty', async () => {
      await expect(
        service.checkout(mockUserId, { items: [] }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.checkout(mockUserId, { items: [] })).rejects.toThrow(
        'Cart is empty',
      );
    });

    it('should throw BadRequestException when product not found or inactive', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.checkout(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.checkout(mockUserId, dto)).rejects.toThrow(
        'One or more products not found or inactive',
      );
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { ...mockProduct, stock: 1 },
      ]);

      await expect(service.checkout(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.checkout(mockUserId, dto)).rejects.toThrow(
        /Insufficient stock/,
      );
    });
  });

  describe('checkout (success)', () => {
    it('should create order and decrement stock', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { ...mockProduct, id: mockProductId, stock: 10 },
      ]);
      const createdOrder = {
        ...mockOrder,
        id: mockOrderId,
        items: [{ productId: mockProductId, quantity: 2, unitPrice: 10, product: mockProduct }],
      };
      (mockTx.order.create as jest.Mock).mockResolvedValue({
        id: mockOrderId,
        userId: mockUserId,
        total: 20,
        status: 'PLACED',
      });
      (mockTx.orderItem.create as jest.Mock).mockResolvedValue({});
      (mockTx.product.update as jest.Mock).mockResolvedValue({});
      (mockTx.order.findUnique as jest.Mock).mockResolvedValue(createdOrder);

      const result = await service.checkout(mockUserId, {
        items: [{ productId: mockProductId, quantity: 2 }],
      });

      expect(result).toEqual(createdOrder);
      expect(mockTx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: mockUserId, total: 20, status: 'PLACED' }),
        }),
      );
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: { stock: { decrement: 2 } },
      });
    });
  });

  describe('myOrders', () => {
    it('should return paginated orders for user', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await service.myOrders(mockUserId, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('findAllOrders', () => {
    it('should return paginated all orders', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAllOrders(
        'ADMIN' as never,
        20,
        0,
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status when valid transition', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PLACED,
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      const result = await service.updateOrderStatus(mockOrderId, OrderStatus.PAID);

      expect(result.status).toBe(OrderStatus.PAID);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: { status: OrderStatus.PAID },
        include: { items: { include: { product: true } } },
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('00000000-0000-0000-0000-000000000000', OrderStatus.PAID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateOrderStatus('00000000-0000-0000-0000-000000000000', OrderStatus.PAID),
      ).rejects.toThrow('Order not found');
    });

    it('should throw BadRequestException when status already delivered or cancelled', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.updateOrderStatus(mockOrderId, OrderStatus.PAID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateOrderStatus(mockOrderId, OrderStatus.PAID),
      ).rejects.toThrow(/Cannot change status/);
    });
  });

  describe('cancelMyOrder', () => {
    it('should cancel order when owner and status allows', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: mockUserId,
        status: OrderStatus.PLACED,
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelMyOrder(mockUserId, mockOrderId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: { status: OrderStatus.CANCELLED },
        include: { items: { include: { product: true } } },
      });
    });

    it('should throw ForbiddenException when not order owner', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: 'different-user-uuid',
      });

      await expect(service.cancelMyOrder(mockUserId, mockOrderId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.cancelMyOrder(mockUserId, mockOrderId)).rejects.toThrow(
        'You can only cancel your own orders',
      );
    });

    it('should throw BadRequestException when order already shipped/delivered/cancelled', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: mockUserId,
        status: OrderStatus.SHIPPED,
      });

      await expect(service.cancelMyOrder(mockUserId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelMyOrder(mockUserId, mockOrderId)).rejects.toThrow(
        'This order can no longer be cancelled',
      );
    });
  });
});
