import { Module } from '@nestjs/common';
import { BlockReportService } from './block-report.service';
import { BlockReportController } from './block-report.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  controllers: [BlockReportController, AdminReportsController],
  providers: [BlockReportService],
  exports: [BlockReportService],
})
export class BlockReportModule {}
