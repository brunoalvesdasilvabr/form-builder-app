import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ElementRef,
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
import {
  getNestedCellWidgets,
  FORM_CONTROL_WIDGET_TYPES,
  WIDGET_TYPES,
  getDefaultWidgetLabel,
  WIDGET_TYPE_INPUT,
  WIDGET_TYPE_LABEL,
  WIDGET_TYPE_RADIO,
  WIDGET_TYPE_TABLE,
} from '../../models/canvas.model';
import * as gridMerge from '../../utils/grid-merge.util';
import { generateId } from '../../utils/id.util';
import { createDefaultNestedTable } from '../../utils/nested-table.util';
import { computeMergeRange, canMergeFromRange, updateSelectionForCtrlClick } from '../../utils/grid-selection.util';
import { getElementKeyFromElement } from '../../utils/element-target.util';
import { computeLayoutDropPosition } from '../../utils/layout-drop.util';
import { CanvasService } from '../../../core/services/canvas.service';
import { LayoutGuardService } from '../../../core/services/layout-guard.service';
import { DragDropDataKey } from '../../constants/drag-drop.constants';
import { getWidgetTypeFromDragEvent } from '../../utils/drag-drop.util';
import type { LayoutActionType, LayoutDropPositionType } from '../../enums';
import { LayoutAction, LayoutDropPosition, SelectedTarget } from '../../enums';

@Component({
  selector: 'app-embedded-table',
  standalone: true,
  imports: [CommonModule, WidgetCellRendererComponent, EmbeddedTableComponent],
  templateUrl: './embedded-table.component.html',
  styleUrl: './embedded-table.component.scss',
})
export class EmbeddedTableComponent {
  widget = input.required<WidgetInstance>();
  parentCellId = input<string | undefined>(undefined);
  parentWidgetId = input<string | undefined>(undefined);
  nestedTableChange = output<NestedTableState>();

  private readonly canvas = inject(CanvasService);
  private readonly layoutGuard = inject(LayoutGuardService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private labelOverflowCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly state = signal<NestedTableState | null>(null);

  private readonly initialDefault = this.defaultState(); // fallback before widget has nestedTable

  /** When dragging Row/Col: { type, rowIndex, colIndex, position } for drop line preview. */
  readonly layoutDropPreview = signal<{
    type: LayoutActionType;
    rowIndex: number;
    colIndex: number;
    position: LayoutDropPositionType;
  } | null>(null);

  readonly rows = computed(() => {
    const s = this.state();
    if (s?.rows?.length) return s.rows;
    const w = this.widget();
    const nested = w?.type === WIDGET_TYPE_TABLE ? w.nestedTable : undefined;
    if (nested?.rows?.length) return nested.rows;
    return this.initialDefault.rows;
  });

  /** Column indices for colgroup (ensures consistent column structure for merge alignment) */
  readonly columnIndices = computed(() =>
    Array.from({ length: this.rows()[0]?.cells.length ?? 0 }, (_, i) => i)
  );

  constructor() {
    effect(() => {
      const w = this.widget();
      const nested = w?.type === WIDGET_TYPE_TABLE ? w.nestedTable : undefined;
      if (nested?.rows?.length) {
        this.state.set(nested);
      } else if (!this.state()) {
        this.state.set(this.defaultState());
      }
    });
    effect(() => {
      const path = this.canvas.nestedSelectionPath();
      const pid = this.parentCellId();
      const wid = this.parentWidgetId();
      if (!path || pid !== path.parentCellId || wid !== path.parentWidgetId) {
        this.selectionCells.set([]);
      }
    });
  }

  private defaultState(): NestedTableState {
    return createDefaultNestedTable('nested');
  }

  private emitState(): void {
    const s = this.state();
    if (s) this.nestedTableChange.emit(s);
  }

  /** Add a row at the given index (before that row). Index 0 = insert at top. */
  addRowAt(rowIndex: number): void {
    const s = this.state();
    if (!s?.rows.length) return;
    const colCount = s.rows[0].cells.length;
    const newCells: NestedTableCell[] = [];
    for (let c = 0; c < colCount; c++) {
      newCells.push({
        id: generateId('nested'),
        rowIndex,
        colIndex: c,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      });
    }
    const rows = [...s.rows];
    rows.splice(rowIndex, 0, { id: generateId(), cells: newCells });
    const updated = rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })),
    }));
    this.state.set({ rows: updated });
    this.emitState();
  }

  /** Remove the row at the given index. Requires at least 2 rows. */
  removeRowAt(rowIndex: number): boolean {
    const s = this.state();
    if (!s?.rows?.length || s.rows.length <= 1) return false;
    if (rowIndex < 0 || rowIndex >= s.rows.length) return false;
    const rows = s.rows.filter((_, i) => i !== rowIndex).map((r, ri) => ({
      ...r,
      cells: r.cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })),
    }));
    this.state.set({ rows });
    this.emitState();
    return true;
  }

  /** Remove the column at the given index. Requires at least 2 columns. */
  removeColumnAt(colIndex: number): boolean {
    const s = this.state();
    const colCount = s?.rows?.[0]?.cells?.length ?? 0;
    if (!s?.rows?.length || colCount <= 1) return false;
    if (colIndex < 0 || colIndex >= colCount) return false;
    const rows = s.rows.map((row, ri) => {
      const cells = row.cells
        .filter((_, ci) => ci !== colIndex)
        .map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci }));
      return { ...row, cells };
    });
    this.state.set({ rows });
    this.emitState();
    return true;
  }

  /** Add a column at the given index (before that column). Index 0 = insert at left. */
  addColumnAt(colIndex: number): void {
    const s = this.state();
    if (!s?.rows.length) return;
    const rows = s.rows.map((row, ri) => {
      const newCell: NestedTableCell = {
        id: generateId('nested'),
        rowIndex: ri,
        colIndex,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      };
      const cells = [...row.cells];
      cells.splice(colIndex, 0, newCell);
      return {
        ...row,
        cells: cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })),
      };
    });
    this.state.set({ rows });
    this.emitState();
  }

  onDrop(e: DragEvent, targetCell: NestedTableCell): void {
    e.preventDefault();
    e.stopPropagation();
    const nestedMove = e.dataTransfer?.getData(DragDropDataKey.NestedMove);
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
    const layoutAction = e.dataTransfer?.getData(DragDropDataKey.LayoutAction) || e.dataTransfer?.getData('text/plain');
    if (layoutAction === LayoutAction.Row || layoutAction === LayoutAction.Col) {
      const preview = this.layoutDropPreview();
      const pos = preview?.rowIndex === targetCell.rowIndex && preview?.colIndex === targetCell.colIndex
        ? preview.position
        : LayoutDropPosition.Before;
      if (layoutAction === LayoutAction.Row) {
        this.addRowAt(pos === LayoutDropPosition.After ? targetCell.rowIndex + 1 : targetCell.rowIndex);
      } else {
        this.addColumnAt(pos === LayoutDropPosition.After ? targetCell.colIndex + 1 : targetCell.colIndex);
      }
      this.layoutDropPreview.set(null);
      (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
      return;
    }
    const type = getWidgetTypeFromDragEvent(e);
    if (!type) return;
    const tableState = this.state();
    if (!tableState) return;
    const newWidget: WidgetInstance = {
      id: generateId('nested'),
      type,
      label: getDefaultWidgetLabel(type),
      placeholder: type === WIDGET_TYPE_INPUT ? 'Enter text...' : undefined,
      options: type === WIDGET_TYPE_RADIO ? ['Option 1', 'Option 2'] : undefined,
    };
    if (type === WIDGET_TYPE_TABLE) {
      (newWidget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable =
        this.defaultState();
    }
    const rows = tableState.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (cell.id !== targetCell.id) return cell;
        const currentWidgets = getNestedCellWidgets(cell);
        return { ...cell, widgets: [...currentWidgets, newWidget] };
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
        if (c.id === fromCellId) {
          const currentWidgets = getNestedCellWidgets(c).filter((w) => w.id !== widget.id);
          return { ...c, widgets: currentWidgets };
        }
        if (c.id === toCellId) {
          const currentWidgets = getNestedCellWidgets(c);
          return { ...c, widgets: [...currentWidgets, widget] };
        }
        return c;
      }),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  onDragOver(e: DragEvent, targetCell: NestedTableCell): void {
    e.preventDefault();
    e.stopPropagation();
    const isNestedMove = e.dataTransfer?.types.includes(DragDropDataKey.NestedMove);
    const layoutRow = e.dataTransfer?.types.includes(DragDropDataKey.LayoutActionRow);
    const layoutCol = e.dataTransfer?.types.includes(DragDropDataKey.LayoutActionCol);
    e.dataTransfer!.dropEffect = isNestedMove ? 'move' : 'copy';
    const el = e.currentTarget as HTMLElement;
    el?.classList.add('embedded-cell-drag-over');
    if (layoutRow || layoutCol) {
      const rect = el.getBoundingClientRect();
      const type = layoutRow ? LayoutAction.Row : LayoutAction.Col;
      const position = computeLayoutDropPosition(rect, e.clientX, e.clientY, type);
      this.layoutDropPreview.set({ type, rowIndex: targetCell.rowIndex, colIndex: targetCell.colIndex, position });
    } else {
      this.layoutDropPreview.set(null);
    }
  }

  onDragLeave(e: DragEvent): void {
    e.stopPropagation();
    (e.currentTarget as HTMLElement)?.classList.remove('embedded-cell-drag-over');
  }

  onTableDragLeave(e: DragEvent): void {
    const related = e.relatedTarget as Node | null;
    const table = e.currentTarget as HTMLElement;
    if (!related || !table.contains(related)) {
      this.layoutDropPreview.set(null);
    }
  }

  removeNestedWidget(cellId: string, widgetId: string): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        const currentWidgets = getNestedCellWidgets(c).filter((w) => w.id !== widgetId);
        return { ...c, widgets: currentWidgets };
      }),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  /** Returns the list of widgets in a nested cell (stacked vertically in the UI). */
  nestedCellWidgets(cell: NestedTableCell): WidgetInstance[] {
    return getNestedCellWidgets(cell);
  }

  readonly selectionCells = signal<string[]>([]); // "row,col", merge only when it's a full rectangle

  readonly mergeRange = computed(() => computeMergeRange(this.selectionCells()));
  readonly canMerge = computed(() => canMergeFromRange(this.mergeRange()));

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().includes(`${rowIndex},${colIndex}`);
  }

  // ctrl+click = add/remove from selection (for Merge/Delete in canvas toolbar). Sync to canvas.
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number, cell: NestedTableCell): void {
    e.stopPropagation();
    if (e.ctrlKey) {
      const next = updateSelectionForCtrlClick(this.selectionCells(), rowIndex, colIndex);
      this.selectionCells.set(next);
      const parentCellId = this.parentCellId();
      const parentWidgetId = this.parentWidgetId();
      if (parentCellId && parentWidgetId) {
        this.canvas.setNestedSelection(parentCellId, parentWidgetId, next);
      }
      return;
    }
    this.clearMergeSelection();
    const parentCellId = this.parentCellId();
    const parentWidgetId = this.parentWidgetId();
    const hasFormControl = cell.widget && (FORM_CONTROL_WIDGET_TYPES as readonly string[]).includes(cell.widget.type);
    const doSelect = () => {
      if (parentCellId && parentWidgetId && cell.widget && cell.widget.type !== WIDGET_TYPE_TABLE) {
        const el = e.target as Element;
        const elementTarget = getElementKeyFromElement(el);
        if (elementTarget) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.Element, elementTarget);
        } else if (
          el?.closest?.('app-widget-input') ||
          el?.closest?.('app-widget-checkbox') ||
          el?.closest?.('app-widget-radio') ||
          el?.closest?.('app-widget-label')
        ) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.WidgetInner);
        } else if (el?.closest?.('app-widget-cell-renderer')) {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.Widget);
        } else {
          this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.Cell);
        }
      } else if (parentCellId && parentWidgetId && cell.widget) {
        // table widget: don't open panel (same as canvas)
      } else if (parentCellId && parentWidgetId) {
        this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.Cell);
      }
    };
    if (hasFormControl && !this.layoutGuard.hasLayoutNamed()) {
      this.layoutGuard.ensureLayoutNamed().then((ok) => {
        if (ok) doSelect();
      });
    } else {
      doSelect();
    }
  }

  clearMergeSelection(): void {
    this.selectionCells.set([]);
    this.canvas.clearNestedSelection();
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
    // Mark as user merge so typing/backspace never auto-unmerges this
    const withUserMerge = mergedRows.map((row, ri) => ({
      ...row,
      cells: row.cells.map((c, ci) =>
        ri === range.r0 && ci === range.c0 ? { ...c, autoMerged: false } : c
      ),
    }));
    this.state.set({ rows: withUserMerge });
    this.nestedTableChange.emit({ rows: withUserMerge });
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

  onCellWidgetLabelChange(cellId: string, widgetId: string, label: string): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        const widgets = getNestedCellWidgets(c).map((w) => (w.id === widgetId ? { ...w, label } : w));
        return { ...c, widgets };
      }),
    }));
    this.state.set({ rows });
    this.emitState();
    this.scheduleMergeUnmergeCheck(cellId);
  }

  /** Called when user types in an input – run same merge/unmerge check as for labels */
  onCellInputValueChange(cellId: string): void {
    this.scheduleMergeUnmergeCheck(cellId);
  }

  private scheduleMergeUnmergeCheck(cellId: string): void {
    if (this.labelOverflowCheckTimeout != null) clearTimeout(this.labelOverflowCheckTimeout);
    this.labelOverflowCheckTimeout = setTimeout(() => {
      this.labelOverflowCheckTimeout = null;
      this.tryAutoMergeOrUnmerge(cellId);
    }, 120);
  }

  /** If label/input overflows → merge with next empty cell; if merged and now fits in one cell → unmerge */
  private tryAutoMergeOrUnmerge(cellId: string): void {
    const s = this.state();
    if (!s?.rows.length) return;
    const found = this.findCellAndControlElement(s, cellId);
    if (!found) return;
    const { cell, cellEl, controlEl, isLabel, isInput } = found;
    const contentWidth = this.getControlContentWidth(controlEl, isInput);
    if (contentWidth < 0) return;
    const span = this.getSpan(cell.rowIndex, cell.colIndex);
    if (span.colSpan > 1) {
      this.tryUnmergeIfFitsInOneCell(s, cell, cellEl, span, contentWidth);
      return;
    }
    this.tryMergeWithNextEmptyCell(s, cell, cellEl, contentWidth);
  }

  /** Resolves the cell, its DOM element, and the label/input control element for merge checks. */
  private findCellAndControlElement(
    s: NestedTableState,
    cellId: string
  ): { cell: NestedTableCell; cellEl: HTMLElement; controlEl: HTMLElement; isLabel: boolean; isInput: boolean } | null {
    const cell = this.findCellById(s.rows, cellId);
    const widgets = cell ? getNestedCellWidgets(cell) : [];
    const firstLabelOrInput = widgets.find((w) => w.type === WIDGET_TYPE_LABEL || w.type === WIDGET_TYPE_INPUT);
    if (!cell || !firstLabelOrInput) return null;
    const isLabel = firstLabelOrInput.type === WIDGET_TYPE_LABEL;
    const isInput = firstLabelOrInput.type === WIDGET_TYPE_INPUT;
    if (!isLabel && !isInput) return null;
    const cellEl = this.hostRef.nativeElement.querySelector(`[data-cell-id="${cellId}"]`) as HTMLElement | null;
    const controlEl = cellEl?.querySelector(isLabel ? '.widget-label-control' : '.widget-input-control') as HTMLElement | null;
    if (!cellEl || !controlEl) return null;
    return { cell, cellEl, controlEl, isLabel, isInput };
  }

  /** If this cell is auto-merged and content fits in one column, unmerge it. */
  private tryUnmergeIfFitsInOneCell(
    s: NestedTableState,
    cell: NestedTableCell,
    cellEl: HTMLElement,
    span: { colSpan: number },
    contentWidth: number
  ): void {
    if (cell.autoMerged !== true) return;
    const oneColWidth = cellEl.clientWidth / span.colSpan;
    if (contentWidth > oneColWidth * 1.1) return;
    const unmergedRows = gridMerge.unmergeCell(
      s.rows as gridMerge.MergeableRow[],
      cell.rowIndex,
      cell.colIndex
    ) as unknown as NestedTableRow[];
    this.state.set({ rows: unmergedRows });
    this.nestedTableChange.emit({ rows: unmergedRows });
  }

  /** If content overflows and the next cell is empty, merge this cell with the next. */
  private tryMergeWithNextEmptyCell(
    s: NestedTableState,
    cell: NestedTableCell,
    cellEl: HTMLElement,
    contentWidth: number
  ): void {
    const nextCol = cell.colIndex + 1;
    if (nextCol >= s.rows[cell.rowIndex].cells.length) return;
    const nextOrigin = gridMerge.getOriginCell(
      s.rows as { cells: gridMerge.MergeableCell[] }[],
      cell.rowIndex,
      nextCol
    );
    if (!nextOrigin || nextOrigin.rowIndex !== cell.rowIndex || nextOrigin.colIndex !== nextCol) return;
    const nextCell = nextOrigin as NestedTableCell;
    if (getNestedCellWidgets(nextCell).length > 0) return;
    if (contentWidth <= cellEl.clientWidth) return;
    const mergedRows = gridMerge.mergeCells(
      s.rows as gridMerge.MergeableRow[],
      cell.rowIndex,
      cell.colIndex,
      cell.rowIndex,
      nextCol
    ) as unknown as NestedTableRow[];
    const withAutoMerge = mergedRows.map((row, ri) => ({
      ...row,
      cells: row.cells.map((c, ci) =>
        ri === cell.rowIndex && ci === cell.colIndex ? { ...c, autoMerged: true } : c
      ),
    }));
    this.state.set({ rows: withAutoMerge });
    this.nestedTableChange.emit({ rows: withAutoMerge });
  }

  /** Get actual text content width – use canvas for both label and input (element width can be wrong when merged) */
  private getControlContentWidth(el: HTMLElement, isInput: boolean): number {
    const text = isInput && 'value' in el
      ? (el as HTMLInputElement).value ?? ''
      : (el.textContent ?? '').trim();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const style = window.getComputedStyle(el);
    ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return ctx.measureText(text ?? '').width;
  }

  private findCellById(rows: NestedTableRow[], cellId: string): NestedTableCell | null {
    for (const row of rows) {
      const c = row.cells.find((x) => x.id === cellId);
      if (c) return c;
    }
    return null;
  }

  onCellOptionSelect(cell: NestedTableCell, _widget: WidgetInstance, optionIndex: number): void {
    const parentCellId = this.parentCellId();
    const parentWidgetId = this.parentWidgetId();
    if (parentCellId && parentWidgetId) {
      this.canvas.setSelectedNestedCell(parentCellId, parentWidgetId, cell.id, SelectedTarget.WidgetInner);
      this.canvas.setSelectedOptionIndex(optionIndex);
    }
  }

  onCellWidgetOptionsChange(cellId: string, widgetId: string, options: string[]): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        const widgets = getNestedCellWidgets(c).map((w) => (w.id === widgetId ? { ...w, options } : w));
        return { ...c, widgets };
      }),
    }));
    this.state.set({ rows });
    this.emitState();
  }

  onCellNestedTableChange(cellId: string, widgetId: string, nestedState: NestedTableState): void {
    const s = this.state();
    if (!s) return;
    const rows = s.rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        const widgets = getNestedCellWidgets(c).map((w) =>
          w.id === widgetId ? { ...w, nestedTable: nestedState } : w
        );
        return { ...c, widgets };
      }),
    }));
    this.state.set({ rows });
    this.emitState();
  }
}
