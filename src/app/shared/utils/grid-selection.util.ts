/**
 * Grid selection utils. Cells are stored as "row,col" strings (e.g. "2,3").
 * Uses string[] for simplicity; see module footer for why Set could be used instead.
 */
export type MergeRange = { r0: number; r1: number; c0: number; c1: number };

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Get merge range from selected cells. Returns null if selection is empty
 * or not a solid rectangle (e.g. L‑shape, gaps).
 */
export function computeMergeRange(selectionCells: string[]): MergeRange | null {
  if (selectionCells.length === 0) return null;

  // Step 1: Find the smallest rectangle that would contain all selected cells
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  for (const key of selectionCells) {
    const [row, col] = key.split(',').map(Number);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }

  // Step 2: Check that every cell inside that rectangle is actually selected.
  // If any is missing, the selection has gaps → not a valid rectangle.
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (!selectionCells.includes(cellKey(row, col))) return null;
    }
  }

  return { r0: minRow, r1: maxRow, c0: minCol, c1: maxCol };
}

/** Can we merge? Only if we have more than one row or column. */
export function canMergeFromRange(range: MergeRange | null): boolean {
  if (!range) return false;
  return range.r0 < range.r1 || range.c0 < range.c1;
}

/**
 * Apply ctrl+click on a cell.
 * - Selected cell clicked → deselect it
 * - Nothing selected → select just this cell
 * - One cell selected → select the rectangle between it and this cell
 * - Many selected → add this cell
 */
export function updateSelectionForCtrlClick(
  current: string[],
  rowIndex: number,
  colIndex: number
): string[] {
  const key = cellKey(rowIndex, colIndex);

  // Toggle off if already selected
  if (current.includes(key)) {
    return current.filter((k) => k !== key);
  }

  // First cell
  if (current.length === 0) return [key];

  // Second cell: fill the rectangle between the two
  if (current.length === 1) {
    const [row0, col0] = current[0].split(',').map(Number);
    const startRow = Math.min(row0, rowIndex), endRow = Math.max(row0, rowIndex);
    const startCol = Math.min(col0, colIndex), endCol = Math.max(col0, colIndex);

    const result: string[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        result.push(cellKey(row, col));
      }
    }
    return result;
  }

  // More than one: just add this cell
  return [...current, key];
}

/*
 * Why use array instead of Set?
 * - Arrays are simpler and more familiar (indexOf, filter, spread).
 * - For typical grid sizes (e.g. 10×10), .includes() is fast enough.
 *
 * Why Set would be better at scale:
 * - .has(key) is O(1) vs .includes() O(n) — matters if selection has many cells.
 * - .add() never duplicates; with array we rely on our logic to avoid duplicates.
 * - Set semantics (no duplicates) match "selected cells" naturally.
 */
