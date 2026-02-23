import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
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
import { WIDGET_TYPES, WIDGET_LABELS } from '../../models/canvas.model';
import * as gridMerge from '../../utils/grid-merge.util';
import { generateId } from '../../utils/id.util';
import { computeMergeRange, canMergeFromRange, updateSelectionForCtrlClick } from '../../utils/grid-selection.util';
import { CanvasService } from '../../../core/services/canvas.service';

const NESTED_MOVE_DATA_TYPE = 'application/x-nested-move';

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
  parentCellId = input<string | undefined>(undefined);
  parentWidgetId = input<string | undefined>(undefined);
  nestedTableChange = output<NestedTableState>();

  private readonly canvas = inject(CanvasService);

  private readonly state = signal<NestedTableState | null>(null);

  private readonly initialDefault = this.defaultState(); // fallback before widget has nestedTable

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
          id: generateId('nested'),
          rowIndex: r,
          colIndex: c,
          widget: null,
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        });
      }
      rows.push({ id: generateId('nested'), cells });
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
        id: generateId('nested'),
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
          id: generateId('nested'),
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
        // ignore bad drop data
      }
      (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
      return;
    }
    const type = (e.dataTransfer?.getData('application/widget-type') ||
      e.dataTransfer?.getData('text/plain')) as WidgetType;
    if (!type || !WIDGET_TYPES.includes(type))
      return;
    const s = this.state();
    if (!s) return;
    const newWidget: WidgetInstance = {
      id: generateId('nested'),
      type,
      label: type === 'radio' ? 'Choose one' : WIDGET_LABELS[type],
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
    e.stopPropagation();
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

  readonly selectionCells = signal<string[]>([]); // "row,col", merge only when it's a full rectangle

  readonly mergeRange = computed(() => computeMergeRange(this.selectionCells()));
  readonly canMerge = computed(() => canMergeFromRange(this.mergeRange()));

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().includes(`${rowIndex},${colIndex}`);
  }

  // same as canvas: ctrl+click to build selection, right-click merged to unmerge. Stop propagation so inner table owns selection (parent table/canvas doesn't receive click).
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number, cell: NestedTableCell): void {
    e.stopPropagation();
    if (e.ctrlKey) {
      this.selectionCells.set(updateSelectionForCtrlClick(this.selectionCells(), rowIndex, colIndex));
    } else {
      this.clearMergeSelection();
      const parentCellId = this.parentCellId();
      const parentWidgetId = this.parentWidgetId();
      if (parentCellId && parentWidgetId && cell.widget && cell.widget.type !== 'table') {
        const el = e.target as Element;
        const elementTarget = el?.closest?.('[data-class-target]')?.getAttribute?.('data-class-target');
        if (elementTarget) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'element', elementTarget);
        } else if (
          el?.closest?.('app-widget-input') ||
          el?.closest?.('app-widget-checkbox') ||
          el?.closest?.('app-widget-radio') ||
          el?.closest?.('app-widget-label')
        ) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'widget-inner');
        } else if (el?.closest?.('app-widget-cell-renderer')) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'widget');
        } else {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'cell');
        }
      } else if (parentCellId && parentWidgetId && cell.widget) {
        // table widget: don't open panel (same as canvas)
      } else if (parentCellId && parentWidgetId) {
        // empty cell
        this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'cell');
      }
    }
  }

  clearMergeSelection(): void {
    this.selectionCells.set([]);
  }

  mergeSelection(): void {
    const range = this.mergeRange();
    if (!range || !this.canMerge()) return;
    const s = this.state();
    if (!s) return;
    const mergedRows = gridMerge.mergeCells(
      s.rows as gridMerge.MergeableRow[],
      range.r0,
      range.c0,
      range.r1,
      range.c1
    ) as unknown as NestedTableRow[];
    this.state.set({ rows: mergedRows });
    this.nestedTableChange.emit({ rows: mergedRows });
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
    e.stopPropagation();
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

  onCellOptionSelect(cell: NestedTableCell, optionIndex: number): void {
    const parentCellId = this.parentCellId();
    const parentWidgetId = this.parentWidgetId();
    if (parentCellId && parentWidgetId && cell.widget) {
      this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, 'widget-inner');
      this.canvas.setSelectedOptionIndex(optionIndex);
    }
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

  onCellNestedTableChange(cellId: string, widgetId: string, nestedState: NestedTableState): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId && c.widget && c.widget.id === widgetId
          ? { ...c, widget: { ...c.widget, nestedTable: nestedState } }
          : c
      ),
    }));
    this.state.set({ rows });
    this.emitState();
  }
}
