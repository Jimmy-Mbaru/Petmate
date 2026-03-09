import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @ApiProperty({
    enum: ['REVIEWED', 'DISMISSED'],
    description: 'New status for the report',
  })
  @IsIn(['REVIEWED', 'DISMISSED'])
  status: 'REVIEWED' | 'DISMISSED';

  @ApiPropertyOptional({
    description: 'Admin notes (internal)',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
