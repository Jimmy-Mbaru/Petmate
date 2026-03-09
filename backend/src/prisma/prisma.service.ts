import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma database client: connect on module init, disconnect on destroy.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connect to the database when the module is initialized.
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error(
        'Failed to connect to database',
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  /**
   * Disconnect from the database when the module is destroyed.
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error(
        'Error disconnecting from database',
        (error as Error)?.stack,
      );
      throw error;
    }
  }
}
