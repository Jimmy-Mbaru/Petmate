import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Long-lived refresh token issued on login/register',
  })
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}
