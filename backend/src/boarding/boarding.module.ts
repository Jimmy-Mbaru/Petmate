import { Module } from '@nestjs/common';
import { BoardingController } from './boarding.controller';
import { BoardingService } from './boarding.service';
import { BoardingJobsService } from './boarding-jobs.service';
import { BlockReportModule } from '../block-report/block-report.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [BlockReportModule, EmailModule],
  controllers: [BoardingController],
  providers: [BoardingService, BoardingJobsService],
  exports: [BoardingService],
})
export class BoardingModule {}
