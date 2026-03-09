import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { LocalStorageService } from './local-storage.service';
import { UploadController } from './upload.controller';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [CloudinaryService, LocalStorageService],
  exports: [CloudinaryService, LocalStorageService],
})
export class CloudinaryModule {}
