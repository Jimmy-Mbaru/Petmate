import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ApiResponsesProtected } from '../common/decorators/api-responses.decorator';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  private readonly logger = new Logger(FavoritesController.name);

  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('pets')
  @ApiOperation({ summary: 'List favorite pets' })
  @ApiResponse({ status: 200, description: 'List of favorite pets with owner' })
  @ApiResponsesProtected()
  async getFavoritePets(@CurrentUser() user: CurrentUserPayload) {
    return await this.favoritesService.getFavoritePets(user.id);
  }

  @Post('pets/:petId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add pet to favorites' })
  @ApiParam({ name: 'petId', type: Number })
  @ApiResponse({ status: 201, description: 'Pet added to favorites' })
  @ApiResponsesProtected()
  async addFavoritePet(
    @CurrentUser() user: CurrentUserPayload,
    @Param('petId') petId: string,
  ) {
    return await this.favoritesService.addFavoritePet(user.id, petId);
  }

  @Delete('pets/:petId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove pet from favorites' })
  @ApiParam({ name: 'petId', type: Number })
  @ApiResponse({ status: 200, description: 'Pet removed from favorites' })
  @ApiResponsesProtected()
  async removeFavoritePet(
    @CurrentUser() user: CurrentUserPayload,
    @Param('petId') petId: string,
  ) {
    return await this.favoritesService.removeFavoritePet(user.id, petId);
  }

  @Get('boarding')
  @ApiOperation({ summary: 'List favorite boarding profiles (saved hosts)' })
  @ApiResponse({ status: 200, description: 'List of favorite boarding profiles' })
  @ApiResponsesProtected()
  async getFavoriteBoardingProfiles(@CurrentUser() user: CurrentUserPayload) {
    return await this.favoritesService.getFavoriteBoardingProfiles(user.id);
  }

  @Post('boarding/:boardingProfileId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add boarding profile to favorites' })
  @ApiParam({ name: 'boardingProfileId', type: Number })
  @ApiResponse({ status: 201, description: 'Boarding profile added to favorites' })
  @ApiResponsesProtected()
  async addFavoriteBoardingProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('boardingProfileId') boardingProfileId: string,
  ) {
    return await this.favoritesService.addFavoriteBoardingProfile(
      user.id,
      boardingProfileId,
    );
  }

  @Delete('boarding/:boardingProfileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove boarding profile from favorites' })
  @ApiParam({ name: 'boardingProfileId', type: Number })
  @ApiResponse({ status: 200, description: 'Boarding profile removed from favorites' })
  @ApiResponsesProtected()
  async removeFavoriteBoardingProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('boardingProfileId') boardingProfileId: string,
  ) {
    return await this.favoritesService.removeFavoriteBoardingProfile(
      user.id,
      boardingProfileId,
    );
  }

  @Get('products')
  @ApiOperation({ summary: 'List favorite products (wishlist)' })
  @ApiResponse({ status: 200, description: 'List of favorite products' })
  @ApiResponsesProtected()
  async getFavoriteProducts(@CurrentUser() user: CurrentUserPayload) {
    return await this.favoritesService.getFavoriteProducts(user.id);
  }

  @Post('products/:productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponsesProtected()
  async addFavoriteProduct(
    @CurrentUser() user: CurrentUserPayload,
    @Param('productId') productId: string,
  ) {
    return await this.favoritesService.addFavoriteProduct(user.id, productId);
  }

  @Delete('products/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist' })
  @ApiResponsesProtected()
  async removeFavoriteProduct(
    @CurrentUser() user: CurrentUserPayload,
    @Param('productId') productId: string,
  ) {
    return await this.favoritesService.removeFavoriteProduct(user.id, productId);
  }
}
