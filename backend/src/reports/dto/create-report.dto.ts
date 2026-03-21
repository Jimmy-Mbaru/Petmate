import { IsString, IsEnum, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  FAKE_PROFILE = 'fake_profile',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SCAM = 'scam',
  UNDERAGE = 'underage',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ACTION_TAKEN = 'action_taken',
}

export class CreateReportDto {
  @ApiProperty({ description: 'ID of the user being reported' })
  @IsString()
  @IsNotEmpty()
  reportedUserId: string;

  @ApiProperty({ enum: ReportReason, description: 'Reason for reporting' })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiProperty({ description: 'Detailed description of the issue', minLength: 20, maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(500)
  description: string;
}

export class UpdateReportDto {
  @ApiProperty({ enum: ReportStatus, required: false, description: 'New status for the report' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiProperty({ required: false, description: 'Admin notes about the report' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
