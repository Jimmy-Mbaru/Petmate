import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: Role,
    description: 'New role for the user: OWNER, HOST, or ADMIN',
  })
  @IsEnum(Role)
  role: Role;
}

