import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description: 'Number of items to skip (page * limit)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export const PAGINATION = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
} as const;

export function getPaginationParams(limit?: number, offset?: number) {
  const take = Math.min(
    Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT,
  );
  const skip = Math.max(0, Number(offset) || 0);
  return { take, skip };
}
