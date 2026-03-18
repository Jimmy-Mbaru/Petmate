import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderStatus, Role } from '@prisma/client';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { EmailService } from '../email/email.service';
export declare class StoreService {
    private readonly prisma;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService);
    private parseProductImageUrls;
    findAllProducts(filters?: {
        q?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
    }, isActiveOnly?: boolean, sortBy?: 'createdAt' | 'price', sortOrder?: 'asc' | 'desc', limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    findOneProduct(id: string): Promise<Record<string, unknown>>;
    createProduct(dto: CreateProductDto): Promise<Record<string, unknown>>;
    updateProduct(id: string, dto: UpdateProductDto): Promise<Record<string, unknown>>;
    removeProduct(id: string): Promise<{
        message: string;
    }>;
    checkout(userId: string, dto: CheckoutDto): Promise<({
        user: {
            email: string;
            name: string;
        };
        items: ({
            product: {
                description: string | null;
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                price: number;
                stock: number;
                category: import(".prisma/client").$Enums.ProductCategory;
                imageUrl: string | null;
                imageUrls: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: number;
            orderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        total: number;
        status: import(".prisma/client").$Enums.OrderStatus;
    }) | null>;
    myOrders(userId: string, limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    findAllOrders(_role: Role, limit?: number, offset?: number): Promise<PaginatedResponse<unknown>>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<{
        items: ({
            product: {
                description: string | null;
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                price: number;
                stock: number;
                category: import(".prisma/client").$Enums.ProductCategory;
                imageUrl: string | null;
                imageUrls: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: number;
            orderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        total: number;
        status: import(".prisma/client").$Enums.OrderStatus;
    }>;
    cancelMyOrder(userId: string, orderId: string): Promise<{
        items: ({
            product: {
                description: string | null;
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                price: number;
                stock: number;
                category: import(".prisma/client").$Enums.ProductCategory;
                imageUrl: string | null;
                imageUrls: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: number;
            orderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        total: number;
        status: import(".prisma/client").$Enums.OrderStatus;
    }>;
    getProductRevenue(productId: string): Promise<{
        productId: string;
        labels: string[];
        data: any[];
        totalRevenue: any;
        totalItemsSold: number;
    }>;
}
