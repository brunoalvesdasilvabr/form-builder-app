import { createDefaultNestedTable } from './nested-table.util';

describe('nested-table.util', () => {
  it('creates 1 row with 3 cells by default', () => {
    const table = createDefaultNestedTable();
    expect(table.rows.length).toBe(1);
    expect(table.rows[0].cells.length).toBe(3);
  });

  it('uses default id prefix', () => {
    const table = createDefaultNestedTable();
    expect(table.rows[0].id).toMatch(/^id-/);
    table.rows[0].cells.forEach((c) => expect(c.id).toMatch(/^id-/));
  });

  it('uses custom id prefix', () => {
    const table = createDefaultNestedTable('nested');
    expect(table.rows[0].id).toMatch(/^nested-/);
    table.rows[0].cells.forEach((c) => expect(c.id).toMatch(/^nested-/));
  });

  it('cell has rowIndex, colIndex, widgets, colSpan, rowSpan, isMergedOrigin', () => {
    const table = createDefaultNestedTable();
    const cell = table.rows[0].cells[1];
    expect(cell.rowIndex).toBe(0);
    expect(cell.colIndex).toBe(1);
    expect(cell.widgets).toEqual([]);
    expect(cell.colSpan).toBe(1);
    expect(cell.rowSpan).toBe(1);
    expect(cell.isMergedOrigin).toBe(true);
  });
});
