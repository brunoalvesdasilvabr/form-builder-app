/**
 * Shared utility for layout Row/Col drag-and-drop.
 * Used when dragging "Row" or "Col" from the palette onto the canvas or embedded table.
 */

export type LayoutDropType = 'row' | 'col';
export type LayoutDropPosition = 'before' | 'after';

/**
 * Compute where to insert a row or column based on drag position over a cell.
 * Returns 'before' or 'after' the target row/column.
 * - For row: vertical position (y < 0.5 = before)
 * - For col: horizontal position (x < 0.5 = before)
 */
export function computeLayoutDropPosition(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  type: LayoutDropType
): LayoutDropPosition {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return type === 'row' ? (y < 0.5 ? 'before' : 'after') : (x < 0.5 ? 'before' : 'after');
}
