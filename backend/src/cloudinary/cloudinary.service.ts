import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'Cloudinary';

/**
 * Options for Cloudinary upload (folder, publicId, overwrite).
 */
export interface UploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
}

/**
 * Cloudinary upload service: upload buffer, delete by public_id. Requires env vars to be configured.
 */
@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.configured = true;
    }
  }

  /**
   * Whether Cloudinary env vars are set (cloud name, api key, secret).
   * @returns true if configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a file buffer to Cloudinary (e.g. from multer memory storage). Returns secure URL.
   * @param buffer - File buffer
   * @param mimeType - MIME type (e.g. image/jpeg)
   * @param options - Optional folder, publicId, overwrite
   * @returns Object with url and publicId
   * @throws Error if Cloudinary not configured or upload fails
   */
  async uploadBuffer(
    buffer: Buffer,
    mimeType: string,
    options: UploadOptions = {},
  ): Promise<{ url: string; publicId: string }> {
    if (!this.configured) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or use local storage.',
      );
    }
    const { folder = 'petmate', publicId, overwrite = true } = options;
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
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
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Delete an asset by public_id (e.g. when replacing avatar).
   * @param publicId - The Cloudinary public_id of the asset
   */
  async deleteByPublicId(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
