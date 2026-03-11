/**
 * Drop position: before or after the target row/column.
 */

export const LayoutDropPosition = { Before: 'before', After: 'after' } as const;
export type LayoutDropPositionType = (typeof LayoutDropPosition)[keyof typeof LayoutDropPosition];
