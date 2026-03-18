export declare const CLOUDINARY = "Cloudinary";
export interface UploadOptions {
    folder?: string;
    publicId?: string;
    overwrite?: boolean;
}
export declare class CloudinaryService {
    private configured;
    constructor();
    isConfigured(): boolean;
    uploadBuffer(buffer: Buffer, mimeType: string, options?: UploadOptions): Promise<{
        url: string;
        publicId: string;
    }>;
    deleteByPublicId(publicId: string): Promise<void>;
}
