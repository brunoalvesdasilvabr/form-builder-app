/**
 * Shared utility for layout Row/Col drag-and-drop.
 * Used when dragging "Row" or "Col" from the palette onto the canvas or embedded table.
 */

import type { LayoutActionType, LayoutDropPositionType } from '../enums';
import { LayoutAction, LayoutDropPosition } from '../enums';

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
  type: LayoutActionType
): LayoutDropPositionType {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return type === LayoutAction.Row
    ? (y < 0.5 ? LayoutDropPosition.Before : LayoutDropPosition.After)
    : (x < 0.5 ? LayoutDropPosition.Before : LayoutDropPosition.After);
}
