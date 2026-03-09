/**
 * Centralized HTTP status codes for consistent API responses.
 * Re-exports NestJS HttpStatus for use in decorators and services.
 */
import { HttpStatus } from '@nestjs/common';

export const HTTP_STATUS = {
  OK: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
  NO_CONTENT: HttpStatus.NO_CONTENT,
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
