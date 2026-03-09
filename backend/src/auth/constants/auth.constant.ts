/**
 * Auth module constants.
 */

export const AUTH = {
  /** Bcrypt salt rounds for password hashing */
  SALT_ROUNDS: 10,
  /** Default JWT expiry in seconds (1 hour) */
  JWT_EXPIRY_SECONDS: 3600,
  /** Refresh token validity in days (long-lived) */
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
} as const;
