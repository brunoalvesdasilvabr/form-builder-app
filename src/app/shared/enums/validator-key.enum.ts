/**
 * Validator keys for min/max length and numeric bounds.
 */

export const ValidatorKey = {
  MinLength: 'minLength',
  MaxLength: 'maxLength',
  Min: 'min',
  Max: 'max',
} as const;
export type ValidatorKeyType = (typeof ValidatorKey)[keyof typeof ValidatorKey];
