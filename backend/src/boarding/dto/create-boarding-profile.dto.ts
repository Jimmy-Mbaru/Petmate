import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoardingProfileDto {
  @ApiProperty()
  @IsString()
  location: string;

  @ApiPropertyOptional({
    description: 'Latitude for geo search (-90 to 90)',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for geo search (-180 to 180)',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity: number;

  @ApiPropertyOptional({
    description:
      'Max pets per night; if set, multiple bookings can overlap up to this per night. If omitted, only one booking at a time (no overlap).',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPetsPerNight?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerDay: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional photo URLs for the boarding profile',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Optional document URLs (e.g. house rules, insurance, vaccination docs)',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  documentUrls?: string[];
}
