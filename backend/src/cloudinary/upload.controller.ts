import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CloudinaryService, UploadOptions } from './cloudinary.service';
import {
  LocalStorageService,
  type UploadFolder,
} from './local-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

const VALID_FOLDERS: UploadFolder[] = [
  'avatars',
  'pets',
  'products',
  'boarding',
  'documents',
];

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly localStorage: LocalStorageService,
  ) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload image (Cloudinary or local storage)',
    description:
      'Upload an image via Multer. Uses Cloudinary if configured, otherwise saves to local disk (uploads/). ' +
      'Returns `url` — set this on User.avatarUrl (folder=avatars), Pet.photoUrl (folder=pets), or Product.imageUrl (folder=products).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file' },
      },
      required: ['file'],
    },
  })
  @ApiQuery({
    name: 'folder',
    required: true,
    enum: VALID_FOLDERS,
    description:
      'Folder type: avatars (→ User.avatarUrl), pets (→ Pet.photoUrl / Pet.photoUrls[]), products (→ Product.imageUrl), boarding (→ BoardingProfile.photoUrls[]), documents (→ BoardingProfile.documentUrls[] / vaccination records)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Upload success; returns url (set on avatarUrl/photoUrl/imageUrl) and publicId',
  })
  @ApiResponsesProtected()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !ALLOWED_MIMES.includes(file.mimetype as (typeof ALLOWED_MIMES)[number])) {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${ALLOWED_MIMES.join(', ')}`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('folder') folder?: string,
  ) {
    if (!file?.buffer) {
      this.logger.warn('Upload attempt with no file provided');
      throw new BadRequestException('No file provided');
    }
    
    const folderKey = (folder?.toLowerCase() || 'avatars') as UploadFolder;
    if (!VALID_FOLDERS.includes(folderKey)) {
      this.logger.warn(`Invalid folder attempted: ${folder}`);
      throw new BadRequestException(
        `Invalid folder. Use one of: ${VALID_FOLDERS.join(', ')}`,
      );
    }

    try {
      if (this.cloudinary.isConfigured()) {
        const options: UploadOptions = {
          folder: `petmate/${folderKey}`,
          overwrite: true,
        };
        this.logger.debug(
          `Uploading image: ${file.originalname}, size=${file.size}, folder=${options.folder}`,
        );
        const result = await this.cloudinary.uploadBuffer(
          file.buffer,
          file.mimetype,
          options,
        );
        this.logger.log(`Uploaded image (Cloudinary): ${result.publicId}`);
        return { url: result.url, publicId: result.publicId };
      }

      this.logger.debug(
        `Uploading image (local): ${file.originalname}, folder=${folderKey}`,
      );
      const result = await this.localStorage.saveBuffer(
        file.buffer,
        file.mimetype,
        folderKey,
      );
      this.logger.log(`Uploaded image (local): ${result.publicId}`);
      return { url: result.url, publicId: result.publicId };
    } catch (error) {
      this.logger.error(
        `Upload failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
