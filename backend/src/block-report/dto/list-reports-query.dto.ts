import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Query DTO for GET /admin/reports so ValidationPipe accepts limit, offset, status.
 */
export class ListReportsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ enum: ['PENDING', 'REVIEWED', 'DISMISSED'] })
  @IsOptional()
  @IsIn(['PENDING', 'REVIEWED', 'DISMISSED'])
  status?: 'PENDING' | 'REVIEWED' | 'DISMISSED';
}
