import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { MatchesQueryDto } from './dto/matches-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  ApiResponsesProtected,
  ApiResponsesCreate,
} from '../common/decorators/api-responses.decorator';

@ApiTags('pets')
@Controller('pets')
export class PetsController {
  private readonly logger = new Logger(PetsController.name);

  constructor(private readonly petsService: PetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create pet (Owner)' })
  @ApiBody({ type: CreatePetDto, description: 'Pet profile data' })
  @ApiResponsesCreate()
  async create(
    @Body() dto: CreatePetDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Create pet requested by user ${user.id}: ${dto.name}`);
      const result = await this.petsService.create(user.id, dto);
      this.logger.log(`Pet created: id=${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Create pet failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My pets (Owner), paginated' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of current user pets (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async findMyPets(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination?: PaginationQueryDto,
  ) {
    try {
      this.logger.debug(`FindMyPets requested by user ${user.id}`);
      return await this.petsService.findByOwner(
        user.id,
        pagination?.limit,
        pagination?.offset,
      );
    } catch (error) {
      this.logger.error(
        `FindMyPets failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Browse available pets (paginated)' })
  @ApiQuery({
    name: 'species',
    required: false,
    description: 'Filter by species (e.g. dog, cat)',
  })
  @ApiQuery({ name: 'breed', required: false, description: 'Filter by breed' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of available pets (data, total, limit, offset)' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(
    @Query('species') species?: string,
    @Query('breed') breed?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    try {
      if (species ?? breed) {
        this.logger.debug(`FindAll pets, filters: species=${species ?? '-'}, breed=${breed ?? '-'}`);
      }
      return await this.petsService.findAll(
        species,
        breed,
        pagination?.limit,
        pagination?.offset,
      );
    } catch (error) {
      this.logger.error('FindAll pets failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Pet detail' })
  @ApiParam({ name: 'id', type: Number, description: 'Pet ID' })
  @ApiResponse({ status: 200, description: 'Pet details' })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string) {
    try {
      this.logger.debug(`FindOne pet requested: ${id}`);
      return await this.petsService.findOne(id);
    } catch (error) {
      this.logger.error(
        `FindOne pet failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own pet' })
  @ApiParam({ name: 'id', type: Number, description: 'Pet ID' })
  @ApiBody({ type: UpdatePetDto })
  @ApiResponsesProtected()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePetDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Update pet requested: ${id} by user ${user.id}`);
      return await this.petsService.update(id, user.id, dto);
    } catch (error) {
      this.logger.error(
        `Update pet failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own pet' })
  @ApiParam({ name: 'id', type: Number, description: 'Pet ID' })
  @ApiResponse({ status: 200, description: 'Pet deleted successfully' })
  @ApiResponsesProtected()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Delete pet requested: ${id} by user ${user.id}`);
      return await this.petsService.remove(id, user.id);
    } catch (error) {
      this.logger.error(
        `Delete pet failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'AI matching: compatible pets for this pet' })
  @ApiParam({ name: 'id', type: String, description: 'Pet ID' })
  @ApiQuery({ name: 'similarBreed', required: false, type: Boolean })
  @ApiQuery({ name: 'verifiedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Top 10 compatible pets with score and explanations',
  })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 403, description: 'Pet not available for matching' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMatches(
    @Param('id') id: string,
    @Query() query: MatchesQueryDto,
  ) {
    try {
      this.logger.debug(`GetMatches requested for pet: ${id}`, query);
      return await this.petsService.getMatches(id, {
        similarBreed: query.similarBreed,
        verifiedOnly: query.verifiedOnly,
        activeOnly: query.activeOnly,
      });
    } catch (error) {
      this.logger.error(
        `GetMatches failed for pet id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
