import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

export type UploadFolder = 'avatars' | 'pets' | 'products' | 'boarding' | 'documents';

const UPLOAD_DIR = 'uploads';
const ALLOWED_FOLDERS: UploadFolder[] = ['avatars', 'pets', 'products', 'boarding', 'documents'];

/**
 * Local disk storage for uploads (fallback when Cloudinary not configured). Saves to ./uploads/{folder}.
 */
@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor() {
    this.basePath = join(process.cwd(), UPLOAD_DIR);
    this.baseUrl =
      process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    this.ensureDirs();
  }

  private ensureDirs() {
    for (const folder of ALLOWED_FOLDERS) {
      const dir = join(this.basePath, folder);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.log(`Created upload directory: ${dir}`);
      }
    }
  }

  /**
   * Save a file buffer to local disk under the given folder. Returns URL for avatarUrl/photoUrl/imageUrl.
   * @param buffer - File buffer
   * @param mimeType - MIME type (used to choose file extension)
   * @param folder - Subfolder (avatars, pets, products, boarding, documents)
   * @returns Object with url and publicId (folder/filename)
   */
  async saveBuffer(
    buffer: Buffer,
    mimeType: string,
    folder: UploadFolder,
  ): Promise<{ url: string; publicId: string }> {
    try {
      const ext = this.getExtension(mimeType);
      const filename = `${randomUUID()}${ext}`;
      const dir = join(this.basePath, folder);
      
      // Ensure directory exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.log(`Created upload directory: ${dir}`);
      }
      
      const filePath = join(dir, filename);
      await writeFile(filePath, buffer);
      const publicId = `${folder}/${filename}`;
      const url = `${this.baseUrl}/${UPLOAD_DIR}/${folder}/${filename}`;
      this.logger.log(`Saved local file: ${filePath}`);
      return { url, publicId };
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[mimeType] || '.bin';
  }

  /**
   * Whether local storage is available (always true).
   * @returns true
   */
  static isConfigured(): boolean {
    return true;
  }
}
