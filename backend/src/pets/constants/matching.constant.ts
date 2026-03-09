/**
 * Rule-based pet matching score weights (AI compatibility).
 */

export const MATCHING_SCORE = {
  /** Same breed (same species implied) */
  SAME_BREED: 40,
  /** Same species, different breed */
  SAME_SPECIES: 20,
  /** Age difference within 12 months */
  AGE_WITHIN_12_MONTHS: 30,
  /** Age difference within 24 months */
  AGE_WITHIN_24_MONTHS: 15,
  /** Opposite gender pair */
  OPPOSITE_GENDER: 30,
} as const;

export const MATCHING_LIMITS = {
  /** Maximum age difference in months for full age score */
  AGE_CLOSE_MONTHS: 12,
  /** Maximum age difference in months for partial age score */
  AGE_MEDIUM_MONTHS: 24,
  /** Number of top matches to return */
  TOP_N: 10,
} as const;
