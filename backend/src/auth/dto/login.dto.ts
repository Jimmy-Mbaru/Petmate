import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Registered email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'Account password' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
