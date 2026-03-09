import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['OWNER', 'HOST', 'ADMIN'] })
  role: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token for Authorization header' })
  access_token: string;

  @ApiProperty({
    description: 'Long-lived refresh token; use POST /auth/refresh to get new access (and optionally new refresh) token',
  })
  refresh_token: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
