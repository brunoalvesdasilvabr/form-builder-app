import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetCellRendererComponent } from '../widget-cell-renderer/widget-cell-renderer.component';
import type {
  WidgetInstance,
  WidgetType,
  NestedTableState,
  NestedTableRow,
  NestedTableCell,
} from '../../models/canvas.model';
import * as gridMerge from '../../utils/grid-merge.util';

const NESTED_MOVE_DATA_TYPE = 'application/x-nested-move';

function generateId(): string {
  return `nested-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EMBEDDED_TABLE_IMPORTS = [CommonModule, WidgetCellRendererComponent];

@Component({
  selector: 'app-embedded-table',
  standalone: true,
  imports: EMBEDDED_TABLE_IMPORTS,
  templateUrl: './embedded-table.component.html',
  styleUrl: './embedded-table.component.scss',
})
export class EmbeddedTableComponent {
  widget = input.required<WidgetInstance>();
  nestedTableChange = output<NestedTableState>();

  private readonly state = signal<NestedTableState | null>(null);

  /** Default used when widget has no nestedTable yet (first paint). */
  private readonly initialDefault = this.defaultState();

  /** Rows to display: from state, or from widget.nestedTable, or default — so first paint is never empty. */
  readonly rows = computed(() => {
    const s = this.state();
    if (s?.rows?.length) return s.rows;
    const w = this.widget();
    const nested = w?.type === 'table' ? w.nestedTable : undefined;
    if (nested?.rows?.length) return nested.rows;
    return this.initialDefault.rows;
  });

  constructor() {
    effect(() => {
      const w = this.widget();
      const nested = w?.type === 'table' ? w.nestedTable : undefined;
      if (nested?.rows?.length) {
        this.state.set(nested);
      } else if (!this.state()) {
        this.state.set(this.defaultState());
      }
    });
  }

  private defaultState(): NestedTableState {
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

  private emitState(): void {
    const s = this.state();
    if (s) this.nestedTableChange.emit(s);
  }

  addRow(): void {
    const s = this.state();
    if (!s?.rows.length) return;
    const colCount = s.rows[0].cells.length;
    const newCells: NestedTableCell[] = [];
    for (let c = 0; c < colCount; c++) {
      newCells.push({
        id: generateId(),
        rowIndex: s.rows.length,
        colIndex: c,
        widget: null,
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      });
    }
    this.state.set({
      rows: [...s.rows, { id: generateId(), cells: newCells }],
    });
    this.emitState();
  }

  removeRow(): void {
    const s = this.state();
    if (!s || s.rows.length <= 1) return;
    this.state.set({ rows: s.rows.slice(0, -1) });
    this.emitState();
  }

  addColumn(): void {
    const s = this.state();
    if (!s?.rows.length) return;
    const rows = s.rows.map((row, ri) => ({
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
        } as NestedTableCell,
      ],
    }));
    this.state.set({ rows });
    this.emitState();
  }

  removeColumn(): void {
    const s = this.state();
    if (!s?.rows.length || s.rows[0].cells.length <= 1) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.slice(0, -1),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  onDrop(e: DragEvent, targetCell: NestedTableCell): void {
    e.preventDefault();
    e.stopPropagation();
    const nestedMove = e.dataTransfer?.getData(NESTED_MOVE_DATA_TYPE);
    if (nestedMove) {
      try {
        const { fromCellId, widget } = JSON.parse(nestedMove) as { fromCellId: string; widget: WidgetInstance };
        if (!widget) return;
        this.moveWidgetInNested(fromCellId, targetCell.id, widget);
      } catch {
        // ignore
      }
      (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
      return;
    }
    const type = (e.dataTransfer?.getData('application/widget-type') ||
      e.dataTransfer?.getData('text/plain')) as WidgetType;
    if (!type || !['input', 'checkbox', 'radio', 'table', 'label'].includes(type))
      return;
    const s = this.state();
    if (!s) return;
    const newWidget: WidgetInstance = {
      id: generateId(),
      type,
      label: type === 'input' ? 'Label' : type === 'checkbox' ? 'Checkbox' : type === 'radio' ? 'Choose one' : type === 'label' ? 'Label' : undefined,
      placeholder: type === 'input' ? 'Enter text...' : undefined,
      options: type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
    };
    if (type === 'table') {
      (newWidget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable =
        this.defaultState();
    }
    const rows = s.rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell) => {
        if (cell.id !== targetCell.id) return cell;
        return { ...cell, widget: newWidget };
      }),
    }));
    this.state.set({ rows });
    this.emitState();
    (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
  }

  moveWidgetInNested(fromCellId: string, toCellId: string, widget: WidgetInstance): void {
    if (fromCellId === toCellId) return;
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id === fromCellId) return { ...c, widget: null };
        if (c.id === toCellId) return { ...c, widget };
        return c;
      }),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const isNestedMove = e.dataTransfer?.types.includes(NESTED_MOVE_DATA_TYPE);
    e.dataTransfer!.dropEffect = isNestedMove ? 'move' : 'copy';
    (e.currentTarget as HTMLElement)?.classList.add('embedded-cell-drag-over');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
  }

  removeNestedWidget(cellId: string): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId ? { ...c, widget: null } : c
      ),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  /** Merge: selection and helpers (reuse same logic as main canvas via grid util). */
  readonly selectionStart = signal<{ row: number; col: number } | null>(null);
  readonly selectionEnd = signal<{ row: number; col: number } | null>(null);

  readonly mergeRange = computed(() => {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return null;
    return {
      r0: Math.min(start.row, end.row),
      r1: Math.max(start.row, end.row),
      c0: Math.min(start.col, end.col),
      c1: Math.max(start.col, end.col),
    };
  });

  readonly canMerge = computed(() => {
    const range = this.mergeRange();
    return range != null && (range.r0 < range.r1 || range.c0 < range.c1);
  });

  isSelected(rowIndex: number, colIndex: number): boolean {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start) return false;
    if (!end) return start.row === rowIndex && start.col === colIndex;
    const r0 = Math.min(start.row, end.row);
    const r1 = Math.max(start.row, end.row);
    const c0 = Math.min(start.col, end.col);
    const c1 = Math.max(start.col, end.col);
    return rowIndex >= r0 && rowIndex <= r1 && colIndex >= c0 && colIndex <= c1;
  }

  onCellClick(rowIndex: number, colIndex: number): void {
    const start = this.selectionStart();
    if (!start) {
      this.selectionStart.set({ row: rowIndex, col: colIndex });
      this.selectionEnd.set(null);
      return;
    }
    if (start.row === rowIndex && start.col === colIndex) {
      this.clearMergeSelection();
      return;
    }
    this.selectionEnd.set({ row: rowIndex, col: colIndex });
  }

  clearMergeSelection(): void {
    this.selectionStart.set(null);
    this.selectionEnd.set(null);
  }

  mergeSelection(): void {
    const range = this.mergeRange();
    if (!range || !this.canMerge()) return;
    const s = this.state();
    if (!s) return;
    this.state.set({
      rows: gridMerge.mergeCells(
        s.rows as gridMerge.MergeableRow[],
        range.r0,
        range.c0,
        range.r1,
        range.c1
      ) as unknown as NestedTableRow[],
    });
    this.emitState();
    this.clearMergeSelection();
  }

  unmergeAt(rowIndex: number, colIndex: number): void {
    const s = this.state();
    if (!s) return;
    this.state.set({
      rows: gridMerge.unmergeCell(
        s.rows as gridMerge.MergeableRow[],
        rowIndex,
        colIndex
      ) as unknown as NestedTableRow[],
    });
    this.emitState();
    this.clearMergeSelection();
  }

  isMergedCell(rowIndex: number, colIndex: number): boolean {
    const span = this.getSpan(rowIndex, colIndex);
    return span.colSpan > 1 || span.rowSpan > 1;
  }

  onCellContextMenu(e: MouseEvent, rowIndex: number, colIndex: number): void {
    if (!this.isMergedCell(rowIndex, colIndex)) return;
    e.preventDefault();
    this.unmergeAt(rowIndex, colIndex);
  }

  shouldSkipCell(rowIndex: number, colIndex: number): boolean {
    const s = this.state();
    if (!s?.rows.length) return false;
    return gridMerge.shouldSkipRendering(
      s.rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }

  getSpan(rowIndex: number, colIndex: number): { colSpan: number; rowSpan: number } {
    const s = this.state();
    if (!s?.rows.length) return { colSpan: 1, rowSpan: 1 };
    return gridMerge.getSpanAt(
      s.rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }

  readonly canRemoveRow = computed(() => (this.state()?.rows.length ?? 0) > 1);
  readonly canRemoveColumn = computed(() => (this.state()?.rows[0]?.cells.length ?? 0) > 1);

  onCellWidgetLabelChange(cellId: string, label: string): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId && c.widget
          ? { ...c, widget: { ...c.widget, label } }
          : c
      ),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  onCellWidgetOptionsChange(cellId: string, options: string[]): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId && c.widget
          ? { ...c, widget: { ...c.widget, options } }
          : c
      ),
    }));
    this.state.set({ rows });
    this.emitState();
  }
}
