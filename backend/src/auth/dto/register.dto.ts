import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    minLength: 6,
    description: 'Password (min 6 characters)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    enum: Role,
    example: 'OWNER',
    description: 'User role: OWNER, HOST, or ADMIN',
  })
  @IsEnum(Role)
  role: Role;
}
