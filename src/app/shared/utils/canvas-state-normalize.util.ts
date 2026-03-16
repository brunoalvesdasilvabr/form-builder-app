import type { CanvasState, CanvasRow, CanvasCell, NestedTableState, NestedTableCell, WidgetInstance } from '../models/canvas.model';
import { getCanvasCellWidgets, getNestedCellWidgets } from '../models/canvas.model';

/**
 * Ensures every nested table cell has a `widgets` array (migrates from legacy `widget`).
 * Used when loading saved state so the rest of the app can assume cell.widgets exists.
 */
function normalizeNestedTableState(nested: NestedTableState): NestedTableState {
  return {
    rows: nested.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => normalizeNestedCell(cell)),
    })),
  };
}

function normalizeNestedCell(cell: NestedTableCell): NestedTableCell {
  const widgets = getNestedCellWidgets(cell);
  const next: NestedTableCell = { ...cell, widgets };
  if ('widget' in next) delete (next as { widget?: unknown }).widget;
  if (next.widgets.length > 0 && next.widgets[0]?.type === 'table' && next.widgets[0].nestedTable) {
    next.widgets[0] = {
      ...next.widgets[0],
      nestedTable: normalizeNestedTableState(next.widgets[0].nestedTable),
    };
  }
  return next;
}

/**
 * Ensures every canvas cell has a `widgets` array (migrates from legacy `widget`).
 * Recursively normalizes nested tables inside table widgets.
 * Call this when loading state from storage or uploaded file.
 */
export function normalizeCanvasState(state: CanvasState): CanvasState {
  return {
    rows: state.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => normalizeCanvasCell(cell)),
    })),
  };
}

function normalizeCanvasCell(cell: CanvasCell): CanvasCell {
  const widgets = getCanvasCellWidgets(cell);
  const next: CanvasCell = { ...cell, widgets };
  if ('widget' in next) delete (next as { widget?: unknown }).widget;
  for (let i = 0; i < next.widgets.length; i++) {
    const w = next.widgets[i];
    if (w?.type === 'table' && w.nestedTable) {
      next.widgets[i] = { ...w, nestedTable: normalizeNestedTableState(w.nestedTable) } as WidgetInstance;
    }
  }
  return next;
}
