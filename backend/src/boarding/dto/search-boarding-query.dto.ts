import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Single query DTO for GET /boarding so ValidationPipe (forbidNonWhitelisted) accepts all params.
 * - Full-text search on location and description (q).
 * - Filters: price range, capacity, minimum rating.
 * - Distance filter (lat, lng, maxDistanceKm) for geo search.
 */
export class SearchBoardingQueryDto {
  @ApiPropertyOptional({
    description:
      'Full-text search on location and description (case-insensitive partial match)',
  })
  @ApiPropertyOptional({ description: 'Legacy alias for q (location/description search)' })
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Minimum price per day',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price per day',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum capacity (number of pets)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({
    description: 'Minimum average rating (1–5). Profiles with no reviews are excluded when this is set.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  /** Reserved: latitude for distance filter (when coordinates are added to BoardingProfile) */
  @ApiPropertyOptional({
    description:
      'Reserved: user latitude for distance filter (ignored until coordinates exist on profiles)',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  /** Reserved: longitude for distance filter */
  @ApiPropertyOptional({
    description:
      'Reserved: user longitude for distance filter (ignored until coordinates exist on profiles)',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  /** Reserved: max distance in km */
  @ApiPropertyOptional({
    description:
      'Reserved: maximum distance in km from (lat, lng) (ignored until coordinates exist on profiles)',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;

  @ApiPropertyOptional({
    description:
      'Filter to profiles with availability on or after this date (ISO YYYY-MM-DD). Use with endDate.',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Filter to profiles with availability on or before this date (ISO YYYY-MM-DD). Use with startDate.',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Items to skip',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
