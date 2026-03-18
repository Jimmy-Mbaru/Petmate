import { CloudinaryService } from './cloudinary.service';
import { LocalStorageService } from './local-storage.service';
export declare class UploadController {
    private readonly cloudinary;
    private readonly localStorage;
    private readonly logger;
    constructor(cloudinary: CloudinaryService, localStorage: LocalStorageService);
    uploadImage(file: Express.Multer.File | undefined, folder?: string): Promise<{
        url: string;
        publicId: string;
    }>;
}
