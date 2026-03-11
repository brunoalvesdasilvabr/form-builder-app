/**
 * Layout actions for drag-and-drop (add row/column to table).
 */

export const LayoutAction = { Row: 'row', Col: 'col' } as const;
export type LayoutActionType = (typeof LayoutAction)[keyof typeof LayoutAction];
