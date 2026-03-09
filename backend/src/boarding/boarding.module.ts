import { Module } from '@nestjs/common';
import { BoardingController } from './boarding.controller';
import { BoardingService } from './boarding.service';
import { BoardingJobsService } from './boarding-jobs.service';
import { BlockReportModule } from '../block-report/block-report.module';

@Module({
  imports: [BlockReportModule],
  controllers: [BoardingController],
  providers: [BoardingService, BoardingJobsService],
  exports: [BoardingService],
})
export class BoardingModule {}
