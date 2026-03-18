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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UploadController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const cloudinary_service_1 = require("./cloudinary.service");
const local_storage_service_1 = require("./local-storage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const api_responses_decorator_1 = require("../common/decorators/api-responses.decorator");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];
const VALID_FOLDERS = [
    'avatars',
    'pets',
    'products',
    'boarding',
    'documents',
];
let UploadController = UploadController_1 = class UploadController {
    cloudinary;
    localStorage;
    logger = new common_1.Logger(UploadController_1.name);
    constructor(cloudinary, localStorage) {
        this.cloudinary = cloudinary;
        this.localStorage = localStorage;
    }
    async uploadImage(file, folder) {
        if (!file?.buffer) {
            this.logger.warn('Upload attempt with no file provided');
            throw new common_1.BadRequestException('No file provided');
        }
        const folderKey = (folder?.toLowerCase() || 'avatars');
        if (!VALID_FOLDERS.includes(folderKey)) {
            this.logger.warn(`Invalid folder attempted: ${folder}`);
            throw new common_1.BadRequestException(`Invalid folder. Use one of: ${VALID_FOLDERS.join(', ')}`);
        }
        try {
            if (this.cloudinary.isConfigured()) {
                const options = {
                    folder: `petmate/${folderKey}`,
                    overwrite: true,
                };
                this.logger.debug(`Uploading image: ${file.originalname}, size=${file.size}, folder=${options.folder}`);
                const result = await this.cloudinary.uploadBuffer(file.buffer, file.mimetype, options);
                this.logger.log(`Uploaded image (Cloudinary): ${result.publicId}`);
                return { url: result.url, publicId: result.publicId };
            }
            this.logger.debug(`Uploading image (local): ${file.originalname}, folder=${folderKey}`);
            const result = await this.localStorage.saveBuffer(file.buffer, file.mimetype, folderKey);
            this.logger.log(`Uploaded image (local): ${result.publicId}`);
            return { url: result.url, publicId: result.publicId };
        }
        catch (error) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload image (Cloudinary or local storage)',
        description: 'Upload an image via Multer. Uses Cloudinary if configured, otherwise saves to local disk (uploads/). ' +
            'Returns `url` — set this on User.avatarUrl (folder=avatars), Pet.photoUrl (folder=pets), or Product.imageUrl (folder=products).',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary', description: 'Image file' },
            },
            required: ['file'],
        },
    }),
    (0, swagger_1.ApiQuery)({
        name: 'folder',
        required: true,
        enum: VALID_FOLDERS,
        description: 'Folder type: avatars (→ User.avatarUrl), pets (→ Pet.photoUrl / Pet.photoUrls[]), products (→ Product.imageUrl), boarding (→ BoardingProfile.photoUrls[]), documents (→ BoardingProfile.documentUrls[] / vaccination records)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Upload success; returns url (set on avatarUrl/photoUrl/imageUrl) and publicId',
    }),
    (0, api_responses_decorator_1.ApiResponsesProtected)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype || !ALLOWED_MIMES.includes(file.mimetype)) {
                cb(new common_1.BadRequestException(`Invalid file type. Allowed: ${ALLOWED_MIMES.join(', ')}`), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
exports.UploadController = UploadController = UploadController_1 = __decorate([
    (0, swagger_1.ApiTags)('upload'),
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [cloudinary_service_1.CloudinaryService,
        local_storage_service_1.LocalStorageService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map