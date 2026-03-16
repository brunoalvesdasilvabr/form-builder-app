import type { NestedTableState, NestedTableRow, NestedTableCell } from '../models/canvas.model';
import { generateId } from './id.util';

/** Creates a 1×3 empty nested table (one row, three columns). Use the same id prefix as the rest of your table (e.g. 'id' for canvas, 'nested' for embedded). */
export function createDefaultNestedTable(idPrefix = 'id'): NestedTableState {
  const rows: NestedTableRow[] = [];
  for (let r = 0; r < 1; r++) {
    const cells: NestedTableCell[] = [];
    for (let c = 0; c < 3; c++) {
      cells.push({
        id: generateId(idPrefix),
        rowIndex: r,
        colIndex: c,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      });
    }
    rows.push({ id: generateId(idPrefix), cells });
  }
  return { rows };
}
