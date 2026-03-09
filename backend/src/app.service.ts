import { Injectable } from '@nestjs/common';

/**
 * Root app service (health / hello).
 */
@Injectable()
export class AppService {
  /**
   * Return a simple hello message.
   * @returns Hello message string
   */
  getHello(): string {
    return 'Hello World!';
  }
}
