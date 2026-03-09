import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email link',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewSecurePass123',
    minLength: 6,
    description: 'New password (min 6 characters)',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

