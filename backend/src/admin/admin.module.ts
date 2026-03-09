import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditInterceptor } from '../common/interceptors/admin-audit.interceptor';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAuditInterceptor],
  exports: [AdminService],
})
export class AdminModule {}
