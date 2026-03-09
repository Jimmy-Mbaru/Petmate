/**
 * Standard API error response shape (used by exception filter and Swagger).
 */
export interface ApiErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** ISO timestamp */
  timestamp: string;
  /** Request path */
  path: string;
  /** HTTP method */
  method: string;
  /** Error message or validation messages */
  message: string | string[];
}
