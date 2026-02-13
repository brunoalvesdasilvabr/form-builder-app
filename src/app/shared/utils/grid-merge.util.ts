// merge/unmerge for canvas + embedded tables (needs rowIndex, colIndex, colSpan, rowSpan, isMergedOrigin on cells)

export interface MergeableCell {
  rowIndex: number;
  colIndex: number;
  colSpan?: number;
  rowSpan?: number;
  isMergedOrigin?: boolean;
}

export interface MergeableRow {
  cells: MergeableCell[];
}

function getSpan(cell: MergeableCell): { colSpan: number; rowSpan: number } {
  return {
    colSpan: cell.colSpan ?? 1,
    rowSpan: cell.rowSpan ?? 1,
  };
}

// which cell actually owns this grid position (for merged ranges)
export function getOriginCell<T extends MergeableCell>(
  rows: { cells: T[] }[],
  rowIndex: number,
  colIndex: number
): T | null {
  for (let r = 0; r <= rowIndex; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c <= colIndex; c++) {
      const cell = row.cells[c];
      if (!cell) continue;
      const { rowSpan, colSpan } = getSpan(cell);
      const endR = r + rowSpan - 1;
      const endC = c + colSpan - 1;
      if (rowIndex <= endR && colIndex <= endC) return cell as T;
    }
  }
  return null;
}

export function getSpanAt<T extends MergeableCell>(
  rows: { cells: T[] }[],
  rowIndex: number,
  colIndex: number
): { colSpan: number; rowSpan: number } {
  const origin = getOriginCell(rows, rowIndex, colIndex);
  if (!origin) return { colSpan: 1, rowSpan: 1 };
  return getSpan(origin);
}

export function shouldSkipRendering<T extends MergeableCell>(
  rows: { cells: T[] }[],
  rowIndex: number,
  colIndex: number
): boolean {
  const origin = getOriginCell(rows, rowIndex, colIndex);
  if (!origin) return true;
  return (origin.rowIndex !== rowIndex || origin.colIndex !== colIndex);
}

export function mergeCells<T extends MergeableRow>(
  rows: T[],
  originRow: number,
  originCol: number,
  endRow: number,
  endCol: number
): T[] {
  const rowSpan = endRow - originRow + 1;
  const colSpan = endCol - originCol + 1;
  return rows.map((row, ri) => ({
    ...row,
    cells: row.cells.map((cell, ci) => {
      const inRange = ri >= originRow && ri <= endRow && ci >= originCol && ci <= endCol;
      if (!inRange) return cell;
      const isOrigin = ri === originRow && ci === originCol;
      return {
        ...cell,
        colSpan: isOrigin ? colSpan : 1,
        rowSpan: isOrigin ? rowSpan : 1,
        isMergedOrigin: isOrigin,
        ...(!isOrigin && 'widget' in cell ? { widget: null } : {}),
      };
    }),
  })) as T[];
}

export function unmergeCell<T extends MergeableRow>(
  rows: T[],
  rowIndex: number,
  colIndex: number
): T[] {
  const origin = getOriginCell(rows, rowIndex, colIndex);
  if (!origin) return rows;
  const { rowSpan, colSpan } = getSpan(origin);
  if (rowSpan === 1 && colSpan === 1) return rows;
  const r0 = origin.rowIndex;
  const c0 = origin.colIndex;
  const originCell = rows[r0]?.cells[c0];
  const originWidget = (originCell as { widget?: unknown })?.widget;
  return rows.map((row, ri) => ({
    ...row,
    cells: row.cells.map((cell, ci) => {
      const inMerged =
        ri >= r0 && ri < r0 + rowSpan && ci >= c0 && ci < c0 + colSpan;
      if (!inMerged) return cell;
      const isOrigin = ri === r0 && ci === c0;
      return {
        ...cell,
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
        ...('widget' in cell ? { widget: isOrigin ? originWidget : null } : {}),
      };
    }),
  })) as T[];
}
