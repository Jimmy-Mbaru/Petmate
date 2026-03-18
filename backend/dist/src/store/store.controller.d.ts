import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ProductsListQueryDto } from './dto/products-list-query.dto';
export declare class StoreController {
    private readonly storeService;
    private readonly logger;
    constructor(storeService: StoreService);
    findAllProducts(query: ProductsListQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    findOneProduct(id: string): Promise<Record<string, unknown>>;
    createProduct(dto: CreateProductDto): Promise<Record<string, unknown>>;
    updateProduct(id: string, dto: UpdateProductDto): Promise<Record<string, unknown>>;
    removeProduct(id: string): Promise<{
        message: string;
    }>;
    checkout(dto: CheckoutDto, user: CurrentUserPayload): Promise<({
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
    myOrders(user: CurrentUserPayload, pagination?: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    findAllOrders(user: CurrentUserPayload, pagination?: PaginationQueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<unknown>>;
    updateOrderStatus(id: string, dto: UpdateOrderStatusDto): Promise<{
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
    cancelMyOrder(id: string, user: CurrentUserPayload): Promise<{
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
    getProductRevenue(id: string): Promise<{
        productId: string;
        labels: string[];
        data: any[];
        totalRevenue: any;
        totalItemsSold: number;
    }>;
}
