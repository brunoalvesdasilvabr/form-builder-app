/**
 * Text alignment for grid columns.
 */

export const TextAlignment = { Left: 'left', Center: 'center', Right: 'right' } as const;
export type TextAlignmentType = (typeof TextAlignment)[keyof typeof TextAlignment];
