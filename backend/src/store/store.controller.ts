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
  Header,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ProductsListQueryDto } from './dto/products-list-query.dto';
import {
  ApiResponsesProtected,
  ApiResponsesCreate,
} from '../common/decorators/api-responses.decorator';

@ApiTags('store')
@Controller('store')
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  @Get('products')
  @SkipThrottle({ default: true })
  @ApiOperation({
    summary: 'Search & discover products (public), paginated',
    description:
      'Full-text search on name/description; filters: category, price range; sort by createdAt or price.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Full-text search on product name and description',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field: createdAt or price',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: asc or desc',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of active products (data, total, limit, offset)' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Header('Cache-Control', 'public, max-age=60')
  async findAllProducts(@Query() query: ProductsListQueryDto) {
    try {
      this.logger.debug(
        `FindAll products requested, q=${query?.q}, category=${query?.category}, sortBy=${query?.sortBy}`,
      );
      return await this.storeService.findAllProducts(
        {
          q: query?.q,
          category: query?.category,
          minPrice: query?.minPrice,
          maxPrice: query?.maxPrice,
        },
        true,
        query?.sortBy ?? 'createdAt',
        query?.sortOrder ?? 'desc',
        query?.limit,
        query?.offset,
      );
    } catch (error) {
      this.logger.error('FindAll products failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Get('products/:id')
  @SkipThrottle({ default: true })
  @ApiOperation({ summary: 'Product detail' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOneProduct(@Param('id') id: string) {
    try {
      this.logger.debug(`FindOne product requested: ${id}`);
      return await this.storeService.findOneProduct(id);
    } catch (error) {
      this.logger.error(
        `FindOne product failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin adds product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponsesCreate()
  async createProduct(@Body() dto: CreateProductDto) {
    try {
      this.logger.log(`Create product requested: ${dto.name}`, {
        name: dto.name,
        price: dto.price,
        stock: dto.stock,
        category: dto.category,
        imageUrls: dto.imageUrls,
        imageUrl: dto.imageUrl,
      });
      const result = await this.storeService.createProduct(dto);
      this.logger.log(`Product created: id=${result.id} name=${result.name}`, {
        id: result.id,
        imageUrls: (result as Record<string, unknown>).imageUrls,
      });
      return result;
    } catch (error) {
      this.logger.error('Create product failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin updates product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponsesProtected()
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    try {
      this.logger.log(`Update product requested: ${id}`);
      return await this.storeService.updateProduct(id, dto);
    } catch (error) {
      this.logger.error(
        `Update product failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin removes product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponsesProtected()
  async removeProduct(@Param('id') id: string) {
    try {
      this.logger.log(`Delete product requested: ${id}`);
      return await this.storeService.removeProduct(id);
    } catch (error) {
      this.logger.error(
        `Delete product failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Post('cart/checkout')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Place order (cart checkout)',
    description:
      'Creates order and order items; inventory is decremented. Payment integration (e.g. Stripe) is not yet implemented — order is created with status PLACED, payment TBD.',
  })
  @ApiBody({
    type: CheckoutDto,
    description: 'Cart items: productId and quantity per item',
  })
  @ApiResponse({ status: 201, description: 'Order created with items (payment TBD)' })
  @ApiResponsesProtected()
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(
        `Checkout requested by user ${user.id}, items: ${dto.items?.length ?? 0}`,
      );
      const result = await this.storeService.checkout(user.id, dto);
      this.logger.log(`Order created: id=${result?.id} for user ${user.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Checkout failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('orders/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "User's order history (paginated)" })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of user orders (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async myOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination?: PaginationQueryDto,
  ) {
    try {
      this.logger.debug(`My orders requested by user ${user.id}`);
      return await this.storeService.myOrders(
        user.id,
        pagination?.limit,
        pagination?.offset,
      );
    } catch (error) {
      this.logger.error(
        `My orders failed for user ${user.id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin views all orders (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of all orders (data, total, limit, offset)' })
  @ApiResponsesProtected()
  async findAllOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination?: PaginationQueryDto,
  ) {
    try {
      this.logger.debug(`FindAll orders requested by admin ${user.id}`);
      return await this.storeService.findAllOrders(
        user.role as Role,
        pagination?.limit,
        pagination?.offset,
      );
    } catch (error) {
      this.logger.error('FindAll orders failed', (error as Error)?.stack);
      throw error;
    }
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin updates order status' })
  @ApiParam({ name: 'id', type: String, description: 'Order ID (UUID)' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponsesProtected()
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    try {
      this.logger.log(
        `Update order status requested: order ${id} to ${dto.status}`,
      );
      return await this.storeService.updateOrderStatus(id, dto.status);
    } catch (error) {
      this.logger.error(
        `Update order status failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Patch('orders/:id/cancel')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User cancels own order (if allowed)' })
  @ApiParam({ name: 'id', type: String, description: 'Order ID (UUID)' })
  @ApiResponsesProtected()
  async cancelMyOrder(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    try {
      this.logger.log(`Cancel order requested: order ${id} by user ${user.id}`);
      return await this.storeService.cancelMyOrder(user.id, id);
    } catch (error) {
      this.logger.error(
        `Cancel order failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  @Get('products/:id/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product revenue data (admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Product revenue data by week/month' })
  @ApiResponsesProtected()
  async getProductRevenue(@Param('id') id: string) {
    try {
      this.logger.debug(`Product revenue requested for id: ${id}`);
      return await this.storeService.getProductRevenue(id);
    } catch (error) {
      this.logger.error(
        `Product revenue failed for id: ${id}`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
