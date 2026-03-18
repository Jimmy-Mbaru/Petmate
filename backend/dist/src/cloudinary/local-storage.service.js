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
var LocalStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const crypto_1 = require("crypto");
const UPLOAD_DIR = 'uploads';
const ALLOWED_FOLDERS = ['avatars', 'pets', 'products', 'boarding', 'documents'];
let LocalStorageService = LocalStorageService_1 = class LocalStorageService {
    logger = new common_1.Logger(LocalStorageService_1.name);
    basePath;
    baseUrl;
    constructor() {
        this.basePath = (0, path_1.join)(process.cwd(), UPLOAD_DIR);
        this.baseUrl =
            process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
        this.ensureDirs();
    }
    ensureDirs() {
        for (const folder of ALLOWED_FOLDERS) {
            const dir = (0, path_1.join)(this.basePath, folder);
            if (!(0, fs_1.existsSync)(dir)) {
                (0, fs_1.mkdirSync)(dir, { recursive: true });
                this.logger.log(`Created upload directory: ${dir}`);
            }
        }
    }
    async saveBuffer(buffer, mimeType, folder) {
        try {
            const ext = this.getExtension(mimeType);
            const filename = `${(0, crypto_1.randomUUID)()}${ext}`;
            const dir = (0, path_1.join)(this.basePath, folder);
            if (!(0, fs_1.existsSync)(dir)) {
                (0, fs_1.mkdirSync)(dir, { recursive: true });
                this.logger.log(`Created upload directory: ${dir}`);
            }
            const filePath = (0, path_1.join)(dir, filename);
            await (0, promises_1.writeFile)(filePath, buffer);
            const publicId = `${folder}/${filename}`;
            const url = `${this.baseUrl}/${UPLOAD_DIR}/${folder}/${filename}`;
            this.logger.log(`Saved local file: ${filePath}`);
            return { url, publicId };
        }
        catch (error) {
            this.logger.error(`Failed to save file: ${error.message}`, error.stack);
            throw error;
        }
    }
    getExtension(mimeType) {
        const map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
        };
        return map[mimeType] || '.bin';
    }
    static isConfigured() {
        return true;
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = LocalStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LocalStorageService);
//# sourceMappingURL=local-storage.service.js.map