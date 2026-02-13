import { Injectable, signal, computed } from '@angular/core';
import type { CanvasState, CanvasRow, CanvasCell, WidgetInstance, WidgetType, NestedTableState, NestedTableRow, NestedTableCell } from '../../shared/models/canvas.model';
import * as gridMerge from '../../shared/utils/grid-merge.util';

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private readonly state = signal<CanvasState>({
    rows: [
      this.createRow(0, 3),
    ],
  });

  readonly rows = computed(() => this.state().rows);

  createRow(rowIndex: number, colCount: number): CanvasRow {
    const cells: CanvasCell[] = [];
    for (let c = 0; c < colCount; c++) {
      cells.push({
        id: generateId(),
        rowIndex,
        colIndex: c,
        widget: null,
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      });
    }
    return { id: generateId(), cells };
  }

  addRow(): void {
    const rows = [...this.state().rows];
    const colCount = rows[0]?.cells.length ?? 3;
    rows.push(this.createRow(rows.length, colCount));
    this.state.set({ rows });
  }

  addColumn(): void {
    const rows = this.state().rows.map((row, ri) => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: generateId(),
          rowIndex: ri,
          colIndex: row.cells.length,
          widget: null,
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        } as CanvasCell,
      ],
    }));
    this.state.set({ rows });
  }

  removeRow(): void {
    const rows = this.state().rows;
    if (rows.length <= 1) return;
    this.state.set({ rows: rows.slice(0, -1) });
  }

  removeColumn(): void {
    const rows = this.state().rows;
    if (!rows.length || rows[0].cells.length <= 1) return;
    this.state.set({
      rows: rows.map((row) => ({
        ...row,
        cells: row.cells.slice(0, -1),
      })),
    });
  }

  getCell(rowIndex: number, colIndex: number): CanvasCell | null {
    const rows = this.state().rows;
    const row = rows[rowIndex];
    if (!row) return null;
    return row.cells[colIndex] ?? null;
  }

  /** Returns the "origin" cell for a given position (handles merged cells). */
  getOriginCell(rowIndex: number, colIndex: number): CanvasCell | null {
    return gridMerge.getOriginCell(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    ) as CanvasCell | null;
  }

  /** Creates default 2x2 nested table state for embedded table widgets. */
  createDefaultNestedTable(): NestedTableState {
    const rows: NestedTableRow[] = [];
    for (let r = 0; r < 2; r++) {
      const cells: NestedTableCell[] = [];
      for (let c = 0; c < 2; c++) {
        cells.push({
          id: generateId(),
          rowIndex: r,
          colIndex: c,
          widget: null,
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        });
      }
      rows.push({ id: generateId(), cells });
    }
    return { rows };
  }

  setWidgetAt(rowIndex: number, colIndex: number, type: WidgetType, label?: string, options?: string[]): void {
    const rows = this.state().rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri !== rowIndex || ci !== colIndex) return cell;
        const widget: WidgetInstance = {
          id: generateId(),
          type,
          label: label ?? (type === 'input' ? 'Label' : type === 'checkbox' ? 'Checkbox' : type === 'radio' ? 'Choose one' : type === 'label' ? 'Label' : undefined),
          options: options ?? (type === 'radio' ? ['Option 1', 'Option 2'] : undefined),
          placeholder: type === 'input' ? 'Enter text...' : undefined,
        };
        if (type === 'table') {
          (widget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable = this.createDefaultNestedTable();
        }
        return { ...cell, widget };
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedTable(cellId: string, widgetId: string, state: NestedTableState): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return {
          ...c,
          widget: { ...c.widget, nestedTable: state },
        };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetLabel(cellId: string, widgetId: string, label: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, label } };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetOptions(cellId: string, widgetId: string, options: string[]): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, options } };
      }),
    }));
    this.state.set({ rows });
  }

  removeWidget(cellId: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId ? { ...c, widget: null } : c
      ),
    }));
    this.state.set({ rows });
  }

  /** Move a widget from one cell to another (main canvas). */
  moveWidget(fromCellId: string, toCellId: string, widget: WidgetInstance): void {
    if (fromCellId === toCellId) return;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id === fromCellId) return { ...c, widget: null };
        if (c.id === toCellId) return { ...c, widget };
        return c;
      }),
    }));
    this.state.set({ rows });
  }

  mergeCells(originRow: number, originCol: number, endRow: number, endCol: number): void {
    this.state.set({
      rows: gridMerge.mergeCells(
        this.state().rows as gridMerge.MergeableRow[],
        originRow,
        originCol,
        endRow,
        endCol
      ) as unknown as CanvasRow[],
    });
  }

  unmergeCell(rowIndex: number, colIndex: number): void {
    this.state.set({
      rows: gridMerge.unmergeCell(
        this.state().rows as gridMerge.MergeableRow[],
        rowIndex,
        colIndex
      ) as unknown as CanvasRow[],
    });
  }

  getOriginForCell(cell: CanvasCell): CanvasCell | null {
    return this.getOriginCell(cell.rowIndex, cell.colIndex);
  }

  isCellHiddenByMerge(rowIndex: number, colIndex: number): boolean {
    const origin = this.getOriginCell(rowIndex, colIndex);
    if (!origin) return true;
    return !origin.isMergedOrigin || (origin.rowIndex === rowIndex && origin.colIndex === colIndex);
  }

  /** Whether this (rowIndex, colIndex) is the top-left of a merged range. */
  isOrigin(rowIndex: number, colIndex: number): boolean {
    const cell = this.getCell(rowIndex, colIndex);
    return cell?.isMergedOrigin ?? false;
  }

  /** Colspan/rowspan for the cell that occupies (rowIndex, colIndex). */
  getSpan(rowIndex: number, colIndex: number): { colSpan: number; rowSpan: number } {
    return gridMerge.getSpanAt(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }

  /** Check if (rowIndex, colIndex) is the origin of a merged cell (so we don't render a duplicate td). */
  shouldSkipRendering(rowIndex: number, colIndex: number): boolean {
    return gridMerge.shouldSkipRendering(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }
}
