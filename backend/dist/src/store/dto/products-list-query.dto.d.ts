export declare class ProductsListQueryDto {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'createdAt' | 'price';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
