import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class AddBlackoutDateDto {
  @ApiProperty({
    description: 'Date to black out (ISO date YYYY-MM-DD)',
    example: '2025-12-25',
  })
  @IsDateString()
  date: string;
}

export class BlackoutDateRangeDto {
  @ApiProperty({ description: 'Start of range (ISO date)', example: '2025-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End of range (ISO date)', example: '2025-06-30' })
  @IsDateString()
  endDate: string;
}
