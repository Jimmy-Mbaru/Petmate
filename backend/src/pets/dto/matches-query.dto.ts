import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Optional preferences for GET /pets/:id/matches.
 * - similarBreed: only return same-species (and prefer same-breed) candidates.
 * - verifiedOnly: only return pets whose owner has verified email.
 * - activeOnly: only return pets whose owner was active recently (lastSeenAt in last 90 days).
 */
export class MatchesQueryDto {
  @ApiPropertyOptional({
    description: 'Prefer / restrict to same species (and same breed when possible)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  similarBreed?: boolean;

  @ApiPropertyOptional({
    description: 'Only include pets whose owner has verified email',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Only include pets whose owner was active recently (last 90 days)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;
}
