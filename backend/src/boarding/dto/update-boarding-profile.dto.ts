import { PartialType } from '@nestjs/swagger';
import { CreateBoardingProfileDto } from './create-boarding-profile.dto';

export class UpdateBoardingProfileDto extends PartialType(
  CreateBoardingProfileDto,
) {}
