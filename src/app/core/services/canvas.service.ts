import { Injectable, signal, computed } from '@angular/core';
import type { CanvasState, CanvasRow, CanvasCell, WidgetInstance, WidgetType, NestedTableState, NestedTableRow, NestedTableCell, BindableProperty } from '../../shared/models/canvas.model';
import { WIDGET_LABELS } from '../../shared/models/canvas.model';
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

  /** Cell id when user clicks a cell (opens right panel) */
  readonly selectedCellId = signal<string | null>(null);
  /** What was clicked: 'cell' = td, 'widget' = app-widget-renderer host, 'widget-inner' = inner component, 'element' = child element */
  readonly selectedTarget = signal<'cell' | 'widget' | 'widget-inner' | 'element'>('cell');
  /** When selectedTarget is 'element', the data-class-target key (e.g. 'label', 'control', 'option-0') */
  readonly selectedElementKey = signal<string | null>(null);

  readonly selectedCell = computed(() => {
    const id = this.selectedCellId();
    if (!id) return null;
    for (const row of this.state().rows) {
      const cell = row.cells.find((c) => c.id === id);
      if (cell) return cell;
    }
    return null;
  });

  /** For radio: which option is selected in the right panel (when user clicked that option) */
  readonly selectedOptionIndex = signal<number | null>(null);

  /** Available properties for binding dropdown; value is used as {{ value }} in component input/value. */
  readonly bindableProperties: BindableProperty[] = [
    { value: 'listValue1', label: 'List Value 1' },
    { value: 'listValue2', label: 'List Value 2' },
    { value: 'listValue3', label: 'List Value 3' },
    { value: 'listValue4', label: 'List Value 4' },
    { value: 'listValue5', label: 'List Value 5' },
  ];

  setSelectedCell(
    cellId: string | null,
    target: 'cell' | 'widget' | 'widget-inner' | 'element' = 'cell',
    elementKey?: string
  ): void {
    this.selectedCellId.set(cellId);
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === 'element' ? (elementKey ?? null) : null);
    this.selectedOptionIndex.set(null);
  }

  setSelectedOptionIndex(index: number | null): void {
    this.selectedOptionIndex.set(index);
  }

  updateCellClass(cellId: string, className: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId ? { ...c, className: className.trim() || undefined } : c
      ),
    }));
    this.state.set({ rows });
  }

  updateWidgetClass(cellId: string, widgetId: string, className: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return {
          ...c,
          widget: { ...c.widget, className: className.trim() || undefined },
        };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetInnerClass(cellId: string, widgetId: string, className: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return {
          ...c,
          widget: { ...c.widget, innerClassName: className.trim() || undefined },
        };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetElementClass(cellId: string, widgetId: string, elementKey: string, className: string): void {
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        const prev = c.widget.elementClasses ?? {};
        const next = { ...prev };
        const val = className.trim();
        if (val) next[elementKey] = val;
        else delete next[elementKey];
        return {
          ...c,
          widget: { ...c.widget, elementClasses: Object.keys(next).length ? next : undefined },
        };
      }),
    }));
    this.state.set({ rows });
  }

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

  // top-left cell for this position (same cell if not merged)
  getOriginCell(rowIndex: number, colIndex: number): CanvasCell | null {
    return gridMerge.getOriginCell(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    ) as CanvasCell | null;
  }

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
          label: label ?? (type === 'radio' ? 'Choose one' : WIDGET_LABELS[type]),
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
        const prev = c.widget.optionBindings ?? [];
        const optionBindings: string[] = options.map((_, i) => prev[i] ?? '');
        return { ...c, widget: { ...c.widget, options, optionBindings } };
      }),
    }));
    this.state.set({ rows });
  }

  updateValueBinding(cellId: string, widgetId: string, propertyName: string): void {
    const binding = propertyName ? `{{ ${propertyName} }}` : undefined;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, valueBinding: binding } };
      }),
    }));
    this.state.set({ rows });
  }

  updateOptionBinding(cellId: string, widgetId: string, optionIndex: number, propertyName: string): void {
    const binding = propertyName ? `{{ ${propertyName} }}` : '';
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        const opts = c.widget.options ?? [];
        const prev = c.widget.optionBindings ?? [];
        const optionBindings: string[] = opts.map((_, i) => (i === optionIndex ? binding : (prev[i] ?? '')));
        return { ...c, widget: { ...c.widget, optionBindings } };
      }),
    }));
    this.state.set({ rows });
  }

  removeWidget(cellId: string): void {
    if (this.selectedCellId() === cellId) {
      this.selectedCellId.set(null);
      this.selectedOptionIndex.set(null);
    }
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) =>
        c.id === cellId ? { ...c, widget: null } : c
      ),
    }));
    this.state.set({ rows });
  }

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

  getSpan(rowIndex: number, colIndex: number): { colSpan: number; rowSpan: number } {
    return gridMerge.getSpanAt(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }

  // skip rendering td when this slot is covered by a merged cell
  shouldSkipRendering(rowIndex: number, colIndex: number): boolean {
    return gridMerge.shouldSkipRendering(
      this.state().rows as { cells: gridMerge.MergeableCell[] }[],
      rowIndex,
      colIndex
    );
  }

  /** Collect binding targets from state (valueBinding / optionBindings) for all non-table widgets in DOM order. */
  getBindingTargetsFromState(): Array<{ valueBinding?: string; optionBindings?: string[] }> {
    const targets: Array<{ valueBinding?: string; optionBindings?: string[] }> = [];
    for (const row of this.state().rows) {
      for (const cell of row.cells) {
        if (!cell.widget) continue;
        if (cell.widget.type === 'table') {
          const nested = cell.widget.nestedTable?.rows ?? [];
          for (const nRow of nested) {
            for (const nCell of nRow.cells) {
              if (!nCell.widget || nCell.widget.type === 'table') continue;
              targets.push({
                valueBinding: nCell.widget.valueBinding,
                optionBindings: nCell.widget.optionBindings?.length ? nCell.widget.optionBindings : undefined,
              });
            }
          }
          continue;
        }
        targets.push({
          valueBinding: cell.widget.valueBinding,
          optionBindings: cell.widget.optionBindings?.length ? cell.widget.optionBindings : undefined,
        });
      }
    }
    return targets;
  }
}
