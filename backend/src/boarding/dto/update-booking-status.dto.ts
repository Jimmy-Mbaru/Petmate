import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DECLINED'] })
  @IsIn(['ACCEPTED', 'DECLINED'])
  status: 'ACCEPTED' | 'DECLINED';
}
