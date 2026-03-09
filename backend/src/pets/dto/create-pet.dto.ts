import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'dog' })
  @IsString()
  species: string;

  @ApiProperty()
  @IsString()
  breed: string;

  @ApiProperty({ description: 'Age in months' })
  @IsInt()
  @Min(0)
  @Max(300)
  @Type(() => Number)
  age: number;

  @ApiProperty()
  @IsString()
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healthNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional additional photo URLs for the pet',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;
}
