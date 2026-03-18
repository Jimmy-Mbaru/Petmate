import { ProductCategory } from '@prisma/client';
export declare class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: ProductCategory;
    imageUrl?: string;
    imageUrls?: string[];
    isActive?: boolean;
}
