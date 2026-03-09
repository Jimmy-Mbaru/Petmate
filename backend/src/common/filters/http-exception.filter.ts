import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-error.interface';
import { HTTP_STATUS } from '../constants/http-status.constant';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === 'object'
          ? ((exceptionResponse as { message?: string | string[] }).message ??
            exceptionResponse)
          : exceptionResponse;
      message = Array.isArray(rawMessage)
        ? rawMessage
        : typeof rawMessage === 'string'
          ? rawMessage
          : ((rawMessage as { message?: string | string[] })?.message ??
            'Unknown error');
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `${exception.name}: ${exception.message}`,
        exception.stack,
      );
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    response.status(status).json(body);
  }
}
