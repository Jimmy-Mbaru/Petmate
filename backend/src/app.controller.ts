import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
@SkipThrottle()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check / API root' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): string {
    try {
      return this.appService.getHello();
    } catch (error) {
      this.logger.error('Health check failed', (error as Error)?.stack);
      throw error;
    }
  }
}
