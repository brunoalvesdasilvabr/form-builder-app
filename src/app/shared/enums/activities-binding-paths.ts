/**
 * Binding paths that refer to activities arrays (for grid column-level binding).
 */

export const ACTIVITIES_BINDING_PATHS = [
  'amsInformation.arrangements[0].amsActivity.activities',
  'nonAmsActivity.activities',
] as const;
