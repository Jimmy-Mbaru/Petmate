export declare class PaginationQueryDto {
    limit?: number;
    offset?: number;
}
export declare const PAGINATION: {
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare function getPaginationParams(limit?: number, offset?: number): {
    take: number;
    skip: number;
};
