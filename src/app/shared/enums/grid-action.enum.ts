/**
 * Grid actions for drag-and-drop (add row/column to grid widget only).
 */

export const GridAction = { Row: 'grid-row', Col: 'grid-col' } as const;
export type GridActionType = (typeof GridAction)[keyof typeof GridAction];
