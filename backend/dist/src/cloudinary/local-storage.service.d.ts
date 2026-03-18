export type UploadFolder = 'avatars' | 'pets' | 'products' | 'boarding' | 'documents';
export declare class LocalStorageService {
    private readonly logger;
    private readonly basePath;
    private readonly baseUrl;
    constructor();
    private ensureDirs;
    saveBuffer(buffer: Buffer, mimeType: string, folder: UploadFolder): Promise<{
        url: string;
        publicId: string;
    }>;
    private getExtension;
    static isConfigured(): boolean;
}
