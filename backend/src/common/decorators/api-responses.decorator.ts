import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Common Swagger response decorators for consistent API documentation.
 */
export function ApiResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad request / validation error' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}

export function ApiResponsesAuth() {
  return applyDecorators(
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 400, description: 'Bad request / validation error' }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized / invalid credentials',
    }),
    ApiResponse({
      status: 409,
      description: 'Conflict (e.g. email already registered)',
    }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}

export function ApiResponsesProtected() {
  return applyDecorators(
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 400, description: 'Bad request / validation error' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 404, description: 'Not found' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}

export function ApiResponsesCreate() {
  return applyDecorators(
    ApiResponse({ status: 201, description: 'Created' }),
    ApiResponse({ status: 400, description: 'Bad request / validation error' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 409, description: 'Conflict' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}
