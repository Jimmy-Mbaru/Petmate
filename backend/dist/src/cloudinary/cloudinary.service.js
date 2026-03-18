"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = exports.CLOUDINARY = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
exports.CLOUDINARY = 'Cloudinary';
let CloudinaryService = class CloudinaryService {
    configured = false;
    constructor() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (cloudName && apiKey && apiSecret) {
            cloudinary_1.v2.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            this.configured = true;
        }
    }
    isConfigured() {
        return this.configured;
    }
    async uploadBuffer(buffer, mimeType, options = {}) {
        if (!this.configured) {
            throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or use local storage.');
        }
        const { folder = 'petmate', publicId, overwrite = true } = options;
        const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
        try {
            const result = await cloudinary_1.v2.uploader.upload(dataUri, {
                folder,
                public_id: publicId,
                overwrite,
                resource_type: 'auto',
            });
            if (!result?.secure_url) {
                throw new Error('Cloudinary upload returned no URL');
            }
            return {
                url: result.secure_url,
                publicId: result.public_id ?? '',
            };
        }
        catch (error) {
            throw new Error(`Cloudinary upload failed: ${error.message}`);
        }
    }
    async deleteByPublicId(publicId) {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map