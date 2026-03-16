import { Injectable, signal, computed } from '@angular/core';
import type {
  CanvasState,
  CanvasRow,
  CanvasCell,
  WidgetInstance,
  WidgetType,
  NestedTableState,
  NestedTableRow,
  NestedTableCell,
  BindableProperty,
} from '../../shared/models/canvas.model';
import { getNestedCellWidgets } from '../../shared/models/canvas.model';
import { computeMergeRange, canMergeFromRange } from '../../shared/utils/grid-selection.util';
import { ACTIVITIES_BINDING_PATHS, SelectedTarget, TextAlignment, ValidatorKey } from '../../shared/enums';
import type { SelectedTargetType, TextAlignmentType } from '../../shared/enums';
import {
  getDefaultWidgetLabel,
  getCanvasCellWidgets,
  getPrimaryWidget,
  FORM_CONTROL_WIDGET_TYPES,
  WIDGET_TYPE_GRID,
  WIDGET_TYPE_INPUT,
  WIDGET_TYPE_RADIO,
  WIDGET_TYPE_TABLE,
} from '../../shared/models/canvas.model';
import { normalizeCanvasState } from '../../shared/utils/canvas-state-normalize.util';
import * as gridMerge from '../../shared/utils/grid-merge.util';
import { generateId } from '../../shared/utils/id.util';
import { createDefaultNestedTable } from '../../shared/utils/nested-table.util';
import { parseBindingProperty } from '../../shared/utils/binding.util';
import { UNDO_LIMIT } from '../../shared/constants/canvas.constants';

/** Returns trimmed string or undefined if empty. */
function trimOrUndefined(str: string | undefined): string | undefined {
  const trimmed = str?.trim();
  return trimmed ? trimmed : undefined;
}

/** Returns a valid TextAlignment value or undefined. */
function normalizeTextAlignment(alignment: string | undefined): TextAlignmentType | undefined {
  if (
    alignment === TextAlignment.Left ||
    alignment === TextAlignment.Center ||
    alignment === TextAlignment.Right
  ) {
    return alignment;
  }
  return undefined;
}

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private readonly state = signal<CanvasState>({ rows: [] });

  private undoStack: CanvasState[] = [];
  readonly canUndo = signal(false);

  readonly rows = computed(() => this.state().rows);

  private pushHistory(): void {
    this.undoStack.push(this.getState());
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.canUndo.set(this.undoStack.length > 0);
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const prev = this.undoStack.pop()!;
    this.loadState(prev);
    this.canUndo.set(this.undoStack.length > 0);
    return true;
  }

  clearUndoHistory(): void {
    this.undoStack = [];
    this.canUndo.set(false);
  }

  /** Cell id when user clicks a cell (opens right panel) */
  readonly selectedCellId = signal<string | null>(null);
  /** When user clicked a widget (target Widget/WidgetInner), the widget id so we apply to that widget in multi-widget cells. */
  readonly selectedWidgetId = signal<string | null>(null);
  /** Nested cell selection: parent canvas cell + table widget + nested cell id */
  readonly selectedNestedPath = signal<{ parentCellId: string; parentWidgetId: string; nestedCellId: string } | null>(null);
  /** What was clicked: cell (td), widget host, widget-inner, or element (child). */
  readonly selectedTarget = signal<SelectedTargetType>(SelectedTarget.Cell);
  /** When selectedTarget is 'element', the data-class-target key (e.g. 'label', 'control', 'option-0') */
  readonly selectedElementKey = signal<string | null>(null);

  /** Finds a canvas cell by id (searches all rows). */
  private getParentCell(cellId: string): CanvasCell | undefined {
    return this.state().rows.flatMap((row) => row.cells).find((cell) => cell.id === cellId);
  }

  /**
   * Returns a new cell with the widget identified by widgetId updated by the updater function.
   * Single responsibility: apply one widget update in a cell.
   */
  private updateWidgetInCell(cell: CanvasCell, widgetId: string, updater: (w: WidgetInstance) => WidgetInstance): CanvasCell {
    const widgets = getCanvasCellWidgets(cell);
    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return cell;
    const nextWidgets = [...widgets];
    nextWidgets[index] = updater(nextWidgets[index]!);
    return { ...cell, widgets: nextWidgets };
  }

  /**
   * Returns a new nested cell with the widget identified by widgetId updated by the updater.
   * Single responsibility: apply one widget update in a nested table cell.
   */
  private updateWidgetInNestedCell(cell: NestedTableCell, widgetId: string, updater: (w: WidgetInstance) => WidgetInstance): NestedTableCell {
    const widgets = getNestedCellWidgets(cell);
    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return cell;
    const nextWidgets = [...widgets];
    nextWidgets[index] = updater(nextWidgets[index]!);
    return { ...cell, widgets: nextWidgets };
  }

  /**
   * Returns new nested table state with the given nested cell's widget updated.
   * Used when updating a widget inside an embedded table.
   */
  private updateNestedTableWidget(
    nestedState: NestedTableState,
    nestedCellId: string,
    nestedWidgetId: string,
    updater: (w: WidgetInstance) => WidgetInstance
  ): NestedTableState {
    return {
      rows: nestedState.rows.map((r) => ({
        ...r,
        cells: r.cells.map((nc) =>
          nc.id !== nestedCellId ? nc : this.updateWidgetInNestedCell(nc, nestedWidgetId, updater)
        ),
      })),
    };
  }

  /** Returns the first table widget in the parent cell, or null if none. */
  private getParentTableWidget(parentCellId: string): (WidgetInstance & { nestedTable?: NestedTableState }) | null {
    const parentCell = this.getParentCell(parentCellId);
    if (!parentCell) return null;
    const widgets = getCanvasCellWidgets(parentCell);
    return widgets.find((w) => w.type === WIDGET_TYPE_TABLE) ?? null;
  }

  readonly selectedCell = computed(() => {
    const nested = this.selectedNestedPath();
    if (nested) {
      const tableWidget = this.getParentTableWidget(nested.parentCellId);
      const nestedRows = tableWidget?.nestedTable?.rows ?? [];
      for (const row of nestedRows) {
        const cell = row.cells.find((cell) => cell.id === nested.nestedCellId);
        if (cell) return cell as unknown as CanvasCell;
      }
      return null;
    }
    const id = this.selectedCellId();
    if (!id) return null;
    for (const row of this.state().rows) {
      const cell = row.cells.find((cell) => cell.id === id);
      if (cell) return cell;
    }
    return null;
  });

  /** For radio: which option is selected in the right panel (when user clicked that option) */
  readonly selectedOptionIndex = signal<number | null>(null);

  /** Canvas (top-level) multi-cell selection. Cleared when user ctrl+clicks in embedded table. */
  readonly canvasSelectionCells = signal<string[]>([]);
  /** Nested table multi-cell selection (for Merge/Delete in toolbar). */
  readonly nestedSelectionPath = signal<{ parentCellId: string; parentWidgetId: string } | null>(null);
  readonly nestedSelectionCells = signal<string[]>([]);

  setCanvasSelection(cells: string[]): void {
    this.canvasSelectionCells.set(cells);
  }

  clearCanvasSelection(): void {
    this.canvasSelectionCells.set([]);
  }

  setNestedSelection(parentCellId: string, parentWidgetId: string, cellKeys: string[]): void {
    if (cellKeys.length > 0) this.clearCanvasSelection();
    this.nestedSelectionPath.set(cellKeys.length ? { parentCellId, parentWidgetId } : null);
    this.nestedSelectionCells.set(cellKeys.length ? [...cellKeys] : []);
  }

  clearNestedSelection(): void {
    this.nestedSelectionPath.set(null);
    this.nestedSelectionCells.set([]);
  }

  /** Available properties for binding dropdown; value is used as {{ value }} in component input/value. */
  readonly bindableProperties: BindableProperty[] = [
    { value: 'arrangements[0].accountArrangement.taxOverlayAccountSetup.lifeCycleStatusType.name', label: 'taxOverlayStatus' },
    { value: 'arrangements[0].accountArrangement.taxOverlayAccountSetup.strategyType.name', label: 'taxOverlayEnrollmentStrategy' },
    { value: 'arrangements[0].accountArrangement.taxOverlayAccountSetup.activationDate', label: 'taxOverlayEnrollmentDate' },
    { value: 'arrangements[0].accountArrangement.assetAccountSetups[0].assetManagementSetup.accountPlatform.name', label: 'platform' },
    { value: 'arrangements[0].accountArrangement.assetAccountSetups[0].assetManagementSetup.moneyManagerDisplayName', label: 'manager' },
    { value: 'arrangements[0].accountArrangement.assetAccountSetups[0].assetManagementSetup.disciplineTypeDisplayName', label: 'discipline' },
    { value: 'arrangements[0].accountArrangement.assetAccountSetups[0].assetManagementSetup.billingStartDate', label: 'platformBeginDate' },
    { value: 'arrangements[0].fees.assetManagementFees[0].customizedRate', label: 'feeRate' },
    // Activities (from amsInformation / nonAmsActivity JSON)
    { value: 'amsInformation.arrangements[0].amsActivity.activities', label: 'AMS Activities' },
    { value: 'nonAmsActivity.activities', label: 'Non-AMS Activities' },
    { value: 'amsInformation.arrangements[0].amsActivity.totalAmount', label: 'AMS Activity totalAmount' },
  ];

  private filterBindableProperties(includeOnlyActivities: boolean): BindableProperty[] {
    return this.bindableProperties.filter((p) =>
      (ACTIVITIES_BINDING_PATHS as readonly string[]).includes(p.value) === includeOnlyActivities
    );
  }

  /** True when valueBinding points to an activities array. */
  private static isActivitiesBinding(valueBinding: string): boolean {
    return (ACTIVITIES_BINDING_PATHS as readonly string[]).includes(valueBinding);
  }

  /** Parent-level only (grid-level): excludes AMS/Non-AMS Activities arrays. */
  get bindablePropertiesGrid(): BindableProperty[] {
    return this.filterBindableProperties(false);
  }

  /** Column-level only (child): AMS Activities, Non-AMS Activities. */
  get bindablePropertiesColumn(): BindableProperty[] {
    return this.filterBindableProperties(true);
  }

  /** When a grid cell is selected and user clicked a column header, this is the column index; null = grid-level. */
  readonly selectedGridColumnIndex = signal<number | null>(null);

  setSelectedGridColumnIndex(index: number | null): void {
    this.selectedGridColumnIndex.set(index);
  }

  setSelectedCell(
    cellId: string | null,
    target: SelectedTargetType = SelectedTarget.Cell,
    elementKey?: string,
    widgetId?: string
  ): void {
    this.selectedCellId.set(cellId);
    this.selectedWidgetId.set(cellId && widgetId ? widgetId : null);
    this.selectedNestedPath.set(null);
    this.nestedSelectionPath.set(null);
    this.nestedSelectionCells.set([]);
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === SelectedTarget.Element ? (elementKey ?? null) : null);
    this.selectedOptionIndex.set(null);
    if (!cellId) {
      this.selectedGridColumnIndex.set(null);
    } else {
      const cell = this.getParentCell(cellId);
      const primary = cell ? getPrimaryWidget(cell) : null;
      if (primary?.type !== WIDGET_TYPE_GRID) this.selectedGridColumnIndex.set(null);
    }
  }

  setSelectedNestedCell(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    target: SelectedTargetType = SelectedTarget.Cell,
    elementKey?: string
  ): void {
    this.selectedCellId.set(null);
    this.selectedNestedPath.set({ parentCellId, parentWidgetId, nestedCellId });
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === SelectedTarget.Element ? (elementKey ?? null) : null);
    this.selectedOptionIndex.set(null);
  }

  setSelectedOptionIndex(index: number | null): void {
    this.selectedOptionIndex.set(index);
  }

  updateCellClass(cellId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id === cellId ? { ...c, className: trimOrUndefined(className) } : c)),
    }));
    this.state.set({ rows });
  }

  updateWidgetClass(cellId: string, widgetId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, className: trimOrUndefined(className) })))),
    }));
    this.state.set({ rows });
  }

  updateWidgetInnerClass(cellId: string, widgetId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, innerClassName: trimOrUndefined(className) })))),
    }));
    this.state.set({ rows });
  }

  updateWidgetElementClass(cellId: string, widgetId: string, elementKey: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          const prev = w.elementClasses ?? {};
          const next = { ...prev };
          const val = trimOrUndefined(className);
          if (val) next[elementKey] = val;
          else delete next[elementKey];
          return { ...w, elementClasses: Object.keys(next).length ? next : undefined };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Updates for nested table cells (inside a table widget). */
  updateNestedCellClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId) return c;
          return this.updateWidgetInCell(c, parentWidgetId, (w) => {
            if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable?.rows) return w;
            const nestedRows = w.nestedTable.rows.map((r) => ({
              ...r,
              cells: r.cells.map((nc) => (nc.id === nestedCellId ? { ...nc, className: trimOrUndefined(className) } : nc)),
            }));
            return { ...w, nestedTable: { rows: nestedRows } };
          });
        }),
      }));
      return { rows };
    });
  }

  updateNestedWidgetClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, className: trimOrUndefined(className) })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetInnerClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, innerClassName: trimOrUndefined(className) })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetElementClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, elementKey: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId) return c;
          return this.updateWidgetInCell(c, parentWidgetId, (w) => {
            if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
            return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => {
              const prev = nw.elementClasses ?? {};
              const next = { ...prev };
              const val = trimOrUndefined(className);
              if (val) next[elementKey] = val;
              else delete next[elementKey];
              return { ...nw, elementClasses: Object.keys(next).length ? next : undefined };
            }) };
          });
        }),
      }));
      return { rows };
    });
  }

  updateNestedValueBinding(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : undefined;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, valueBinding: binding })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedOptionBinding(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, optionIndex: number, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : '';
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => {
            const opts = nw.options ?? [];
            const prev = nw.optionBindings ?? [];
            const optionBindings = opts.map((_, i) => (i === optionIndex ? binding : (prev[i] ?? '')));
            return { ...nw, optionBindings };
          }) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetFormControlName(cellId: string, widgetId: string, formControlName: string): void {
    this.pushHistory();
    const val = trimOrUndefined(formControlName);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, formControlName: val })))),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetFormControlName(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    formControlName: string
  ): void {
    this.pushHistory();
    const val = trimOrUndefined(formControlName);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, formControlName: val })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetVisibilityCondition(cellId: string, widgetId: string, visibilityCondition: string): void {
    this.pushHistory();
    const val = trimOrUndefined(visibilityCondition);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, visibilityCondition: val })))),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetVisibilityCondition(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    visibilityCondition: string
  ): void {
    this.pushHistory();
    const val = trimOrUndefined(visibilityCondition);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, visibilityCondition: val })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  private updateWidgetValidatorValue(
    cellId: string,
    widgetId: string,
    key: (typeof ValidatorKey)[keyof typeof ValidatorKey],
    value: number | undefined
  ): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, [key]: value })))),
    }));
    this.state.set({ rows });
  }

  updateWidgetMinLength(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, ValidatorKey.MinLength, value);
  }

  updateWidgetMaxLength(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, ValidatorKey.MaxLength, value);
  }

  updateWidgetMin(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, ValidatorKey.Min, value);
  }

  updateWidgetMax(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, ValidatorKey.Max, value);
  }

  updateWidgetPattern(cellId: string, widgetId: string, value: string | undefined): void {
    this.pushHistory();
    const val = trimOrUndefined(value ?? '') as string | undefined;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, pattern: val })))),
    }));
    this.state.set({ rows });
  }

  private updateNestedWidgetValidatorValue(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    key: (typeof ValidatorKey)[keyof typeof ValidatorKey],
    value: number | undefined
  ): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, [key]: value })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetMinLength(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, ValidatorKey.MinLength, value);
  }

  updateNestedWidgetMaxLength(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, ValidatorKey.MaxLength, value);
  }

  updateNestedWidgetMin(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, ValidatorKey.Min, value);
  }

  updateNestedWidgetMax(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, ValidatorKey.Max, value);
  }

  updateNestedWidgetPattern(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: string | undefined
  ): void {
    this.pushHistory();
    const val = trimOrUndefined(value ?? '');
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, pattern: val })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  createRow(rowIndex: number, colCount: number): CanvasRow {
    const cells: CanvasCell[] = [];
    for (let c = 0; c < colCount; c++) {
      cells.push({
        id: generateId('id'),
        rowIndex,
        colIndex: c,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: true,
      });
    }
    return { id: generateId('id'), cells };
  }

  /** Add a row at the given index (before that row). Index 0 = insert at top. */
  addRowAt(rowIndex: number): void {
    this.pushHistory();
    const rows = [...this.state().rows];
    const colCount = rows[0]?.cells.length ?? 3;
    const newRow = this.createRow(rowIndex, colCount);
    rows.splice(rowIndex, 0, newRow);
    // Update rowIndex/colIndex for rows after insert
    const updated = rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((c, ci) => ({
        ...c,
        rowIndex: ri,
        colIndex: ci,
      })),
    }));
    this.state.set({ rows: updated });
  }

  /** Add a column at the given index (before that column). Index 0 = insert at left. */
  addColumnAt(colIndex: number): void {
    this.pushHistory();
    const rows = this.state().rows.map((row, ri) => {
      const newCell: CanvasCell = {
        id: generateId('id'),
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
  }

  /**
   * Remove the row at the given index. Requires at least 2 rows.
   * Handles merged cells: content is preserved only if the deleted row does not include
   * the top-most cell (origin) of a merge; otherwise the merge is unmerged then the row is removed.
   */
  removeRowAt(rowIndex: number): boolean {
    let rows = this.state().rows;
    if (rows.length <= 1) return false;
    if (rowIndex < 0 || rowIndex >= rows.length) return false;
    this.pushHistory();

    const rowToDelete = rows[rowIndex];
    if (rowToDelete) {
      for (let ci = 0; ci < rowToDelete.cells.length; ci++) {
        const cell = rowToDelete.cells[ci];
        if (cell?.isMergedOrigin && (cell.rowSpan > 1 || cell.colSpan > 1)) {
          rows = gridMerge.unmergeCell(
            rows as gridMerge.MergeableRow[],
            rowIndex,
            ci
          ) as unknown as CanvasRow[];
        }
      }
    }

    const rowsWithReducedSpan = rows.map((row, ri) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (ri >= rowIndex) return c;
        if (!c.isMergedOrigin || c.rowSpan <= 1) return c;
        if (rowIndex >= ri + c.rowSpan) return c;
        return { ...c, rowSpan: c.rowSpan - 1 };
      }),
    }));

    const next = rowsWithReducedSpan
      .filter((_, i) => i !== rowIndex)
      .map((r, ri) => ({
        ...r,
        cells: r.cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })),
      }));
    this.state.set({ rows: next });
    return true;
  }

  /**
   * Remove the column at the given index. Requires at least 2 columns.
   * Handles merged cells: content is preserved only if the deleted column does not include
   * the left-most cell (origin) of a merge; otherwise the merge is unmerged then the column is removed.
   */
  removeColumnAt(colIndex: number): boolean {
    let rows = this.state().rows;
    const colCount = rows[0]?.cells.length ?? 0;
    if (colCount <= 1) return false;
    if (colIndex < 0 || colIndex >= colCount) return false;
    this.pushHistory();

    for (let ri = 0; ri < rows.length; ri++) {
      const cell = rows[ri]?.cells[colIndex];
      if (cell?.isMergedOrigin && (cell.colSpan > 1 || cell.rowSpan > 1)) {
        rows = gridMerge.unmergeCell(
          rows as gridMerge.MergeableRow[],
          ri,
          colIndex
        ) as unknown as CanvasRow[];
      }
    }

    const rowsWithReducedSpan = rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (!c.isMergedOrigin || c.colSpan <= 1) return c;
        if (colIndex < c.colIndex || colIndex >= c.colIndex + c.colSpan) return c;
        return { ...c, colSpan: c.colSpan - 1 };
      }),
    }));

    const next = rowsWithReducedSpan.map((row, ri) => {
      const cells = row.cells
        .filter((_, ci) => ci !== colIndex)
        .map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci }));
      return { ...row, cells };
    });
    this.state.set({ rows: next });
    return true;
  }

  /** Merge range for nested selection; null if not a valid rectangle. */
  getNestedMergeRange(): { r0: number; r1: number; c0: number; c1: number } | null {
    return computeMergeRange(this.nestedSelectionCells());
  }

  canMergeNested(): boolean {
    return canMergeFromRange(this.getNestedMergeRange());
  }

  /** When a nested cell is selected, returns its row/col; otherwise null. */
  getSelectedNestedRowCol(): { rowIndex: number; colIndex: number } | null {
    const path = this.selectedNestedPath();
    if (!path) return null;
    const tableWidget = this.getParentTableWidget(path.parentCellId);
    const nestedRows = tableWidget?.nestedTable?.rows ?? [];
    for (const row of nestedRows) {
      const cell = row.cells.find((cell) => cell.id === path.nestedCellId);
      if (cell) return { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
    }
    return null;
  }

  /** Row and column count of a nested table. */
  getNestedTableSize(parentCellId: string, parentWidgetId: string): { rowCount: number; colCount: number } | null {
    const tableWidget = this.getParentTableWidget(parentCellId);
    const nested = tableWidget?.nestedTable?.rows;
    if (!nested?.length) return null;
    return { rowCount: nested.length, colCount: nested[0].cells.length };
  }

  removeNestedRowAt(parentCellId: string, parentWidgetId: string, rowIndex: number): boolean {
    const tableWidget = this.getParentTableWidget(parentCellId);
    const nested = tableWidget?.nestedTable?.rows;
    if (!nested || nested.length <= 1) return false;
    if (rowIndex < 0 || rowIndex >= nested.length) return false;
    this.pushHistory();
    const newRows = nested
      .filter((_, i) => i !== rowIndex)
      .map((r, ri) => ({ ...r, cells: r.cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })) })) as NestedTableRow[];
    this.updateNestedTable(parentCellId, parentWidgetId, { rows: newRows });
    return true;
  }

  removeNestedColumnAt(parentCellId: string, parentWidgetId: string, colIndex: number): boolean {
    const tableWidget = this.getParentTableWidget(parentCellId);
    const nested = tableWidget?.nestedTable?.rows;
    const colCount = nested?.[0]?.cells.length ?? 0;
    if (!nested?.length || colCount <= 1) return false;
    if (colIndex < 0 || colIndex >= colCount) return false;
    this.pushHistory();
    const newRows = nested.map((row, ri) => {
      const cells = row.cells.filter((_, ci) => ci !== colIndex).map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })) as NestedTableCell[];
      return { ...row, cells };
    }) as NestedTableRow[];
    this.updateNestedTable(parentCellId, parentWidgetId, { rows: newRows });
    return true;
  }

  mergeNestedSelection(): void {
    const path = this.nestedSelectionPath();
    const range = this.getNestedMergeRange();
    if (!path || !range || !canMergeFromRange(range)) return;
    const tableWidget = this.getParentTableWidget(path.parentCellId);
    const nested = tableWidget?.nestedTable?.rows;
    if (!nested) return;
    this.pushHistory();
    const mergedRows = gridMerge.mergeCells(nested as gridMerge.MergeableRow[], range.r0, range.c0, range.r1, range.c1);
    this.updateNestedTable(path.parentCellId, path.parentWidgetId, { rows: mergedRows as NestedTableRow[] });
    this.clearNestedSelection();
  }

  createDefaultNestedTable(): NestedTableState {
    return createDefaultNestedTable('id');
  }

  /** All form control names from inputs/checkbox/radio in the layout (top-level and nested). */
  getControlNamesInLayout(): string[] {
    const set = new Set<string>();
    const addFromRows = (rows: CanvasRow[]): void => {
      for (const row of rows) {
        for (const cell of row.cells) {
          for (const w of getCanvasCellWidgets(cell)) {
            if (FORM_CONTROL_WIDGET_TYPES.includes(w.type) && w.formControlName?.trim()) {
              set.add(w.formControlName.trim());
            }
            if (w.type === WIDGET_TYPE_TABLE && w.nestedTable?.rows?.length) {
              addFromNestedRows(w.nestedTable.rows);
            }
          }
        }
      }
    };
    const addFromNestedRows = (nestedRows: NestedTableState['rows']): void => {
      for (const row of nestedRows) {
        for (const cell of row.cells) {
          for (const w of getNestedCellWidgets(cell)) {
            if (w && FORM_CONTROL_WIDGET_TYPES.includes(w.type) && w.formControlName?.trim()) {
              set.add(w.formControlName.trim());
            }
            if (w?.type === WIDGET_TYPE_TABLE && w.nestedTable?.rows?.length) {
              addFromNestedRows(w.nestedTable.rows);
            }
          }
        }
      }
    };
    addFromRows(this.state().rows);
    return Array.from(set).sort();
  }

  /** Default 3 columns for new grid widgets. Column names empty so no headers show until user inputs them. */
  private createDefaultGridColumns(): { id: string; columnName: string; headerName?: string }[] {
    return [
      { id: generateId('id'), columnName: '' },
      { id: generateId('id'), columnName: '' },
      { id: generateId('id'), columnName: '' },
    ];
  }

  /** When canvas is empty, creates initial row and adds the first widget. Use for first drop on empty state. */
  setWidgetOnEmptyCanvas(type: WidgetType, label?: string, options?: string[]): void {
    const rows = this.state().rows;
    if (rows.length > 0) return;
    this.pushHistory();
    const newRow = this.createRow(0, 1);
    const cell = newRow.cells[0]!;
    const newWidget = this.createNewWidgetInstance(type, label, options);
    const updatedRow = { ...newRow, cells: [{ ...cell, widgets: [newWidget] }] };
    this.state.set({ rows: [updatedRow] });
  }

  /**
   * Appends a new widget to the cell at the given position.
   * Components are stacked one under the other in drop order.
   */
  addWidgetToCellAt(rowIndex: number, colIndex: number, type: WidgetType, label?: string, options?: string[]): void {
    this.pushHistory();
    const newWidget = this.createNewWidgetInstance(type, label, options);
    const rows = this.state().rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri !== rowIndex || ci !== colIndex) return cell;
        const currentWidgets = getCanvasCellWidgets(cell);
        return { ...cell, widgets: [...currentWidgets, newWidget] };
      }),
    }));
    this.state.set({ rows });
  }

  /** Creates a new widget instance with defaults for the given type. Single responsibility. */
  private createNewWidgetInstance(type: WidgetType, label?: string, options?: string[]): WidgetInstance {
    const widget: WidgetInstance = {
      id: generateId('id'),
      type,
      label: getDefaultWidgetLabel(type, label),
      options: options ?? (type === WIDGET_TYPE_RADIO ? ['Option 1', 'Option 2'] : undefined),
      placeholder: type === WIDGET_TYPE_INPUT ? 'Enter text...' : undefined,
    };
    if (type === WIDGET_TYPE_TABLE) {
      (widget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable = this.createDefaultNestedTable();
    }
    if (type === WIDGET_TYPE_GRID) {
      (widget as WidgetInstance & { gridColumns: { id: string; columnName: string; headerName?: string }[] }).gridColumns = this.createDefaultGridColumns();
    }
    return widget;
  }

  /** Sets or appends a widget at the cell. Used by drop: always appends so multiple components stack. */
  setWidgetAt(rowIndex: number, colIndex: number, type: WidgetType, label?: string, options?: string[]): void {
    this.addWidgetToCellAt(rowIndex, colIndex, type, label, options);
  }

  updateNestedTable(cellId: string, widgetId: string, state: NestedTableState): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, nestedTable: state })))),
    }));
    this.state.set({ rows });
  }

  updateWidgetLabel(cellId: string, widgetId: string, label: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, label })))),
    }));
    this.state.set({ rows });
  }

  /** Set preview data for a grid widget. Row objects’ keys should match column columnName. */
  updateGridDataSourcePreview(cellId: string, widgetId: string, data: Record<string, unknown>[]): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => (w.type !== WIDGET_TYPE_GRID ? w : { ...w, gridDataSourcePreview: data }));
      }),
    }));
    this.state.set({ rows });
  }

  /** Add a column to the right of the grid. */
  addGridColumn(cellId: string, widgetId: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = w.gridColumns ?? [];
          const newCol = { id: generateId('id'), columnName: '' };
          return { ...w, gridColumns: [...cols, newCol] };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Sample activity data for grid preview when columns are bound to AMS/Non-AMS Activities. */
  private static readonly SAMPLE_ACTIVITIES: Record<string, unknown>[] = [
    { entryDate: '2024-01-15', effectiveDate: '2024-01-15', amount: 150.50, additionalDescription: 'Sample 1', description: 'Activity 1', activityTypeCode: 'TYPE_A', categoryCode: 'CAT1', currencyCode: 'USD', transactionId: 'TXN-001', transactionDate: '2024-01-15' },
    { entryDate: '2024-02-20', effectiveDate: '2024-02-20', amount: 275.00, additionalDescription: 'Sample 2', description: 'Activity 2', activityTypeCode: 'TYPE_B', categoryCode: 'CAT2', currencyCode: 'EUR', transactionId: 'TXN-002', transactionDate: '2024-02-20' },
    { entryDate: '2024-03-10', effectiveDate: '2024-03-10', amount: 99.99, additionalDescription: 'Sample 3', description: 'Activity 3', activityTypeCode: 'TYPE_A', categoryCode: 'CAT1', currencyCode: 'USD', transactionId: 'TXN-003', transactionDate: '2024-03-10' },
  ];

  /** Update column binding for a grid; when binding to activities, populates preview data and sets column header to the chosen label (e.g. "Entry Date"). */
  updateGridColumnBinding(cellId: string, widgetId: string, columnIndex: number, valueBinding: string, activityDataProperty: string, headerLabel?: string): void {
    this.pushHistory();
    const isActivities = CanvasService.isActivitiesBinding(valueBinding);
    const sampleData = isActivities ? CanvasService.SAMPLE_ACTIVITIES : undefined;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = [...(w.gridColumns ?? [])];
          if (columnIndex < 0 || columnIndex >= cols.length) return w;
          const col = cols[columnIndex];
          const newCol = valueBinding
            ? { ...col, valueBinding, activityDataProperty: isActivities ? activityDataProperty : undefined, headerName: isActivities && headerLabel ? headerLabel : col.headerName }
            : { ...col, valueBinding: undefined, activityDataProperty: undefined };
          cols[columnIndex] = newCol;
          const newWidget = { ...w, gridColumns: cols };
          if (sampleData?.length) (newWidget as WidgetInstance & { gridDataSourcePreview: Record<string, unknown>[] }).gridDataSourcePreview = sampleData;
          return newWidget;
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Update grid-level header text and alignment. */
  updateGridHeaderText(cellId: string, widgetId: string, headerText: string, headerAlignment?: TextAlignmentType | ''): void {
    this.pushHistory();
    const trimmedHeaderText = (headerText ?? '').trim();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const updates: Record<string, unknown> = { gridHeaderText: trimmedHeaderText || undefined };
          if (headerAlignment !== undefined) updates['gridHeaderAlignment'] = normalizeTextAlignment(headerAlignment);
          return { ...w, ...updates };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Update grid-level footer text and alignment. */
  updateGridFooterText(cellId: string, widgetId: string, footerText: string, footerAlignment?: TextAlignmentType | ''): void {
    this.pushHistory();
    const trimmedFooterText = (footerText ?? '').trim();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const updates: Record<string, unknown> = { gridFooterText: trimmedFooterText || undefined };
          if (footerAlignment !== undefined) updates['gridFooterAlignment'] = normalizeTextAlignment(footerAlignment);
          return { ...w, ...updates };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Update column name (optional). When empty, column uses id as fallback. */
  updateGridColumnName(cellId: string, widgetId: string, columnIndex: number, columnName: string): void {
    this.pushHistory();
    const colName = (columnName ?? '').trim();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = [...(w.gridColumns ?? [])];
          if (columnIndex < 0 || columnIndex >= cols.length) return w;
          const col = cols[columnIndex];
          cols[columnIndex] = { ...col, columnName: colName };
          return { ...w, gridColumns: cols };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Update column class and alignment (cell) for a grid column. */
  updateGridColumnClassAndAlignment(cellId: string, widgetId: string, columnIndex: number, className: string, alignment: TextAlignmentType | ''): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = [...(w.gridColumns ?? [])];
          if (columnIndex < 0 || columnIndex >= cols.length) return w;
          const column = cols[columnIndex];
          cols[columnIndex] = { ...column, className: trimOrUndefined(className), alignment: normalizeTextAlignment(alignment) };
          return { ...w, gridColumns: cols };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Update column header alignment and sortable. */
  updateGridColumnDetails(cellId: string, widgetId: string, columnIndex: number, headerAlignment: TextAlignmentType | '', sortable: boolean): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = [...(w.gridColumns ?? [])];
          if (columnIndex < 0 || columnIndex >= cols.length) return w;
          const column = cols[columnIndex];
          cols[columnIndex] = { ...column, headerAlignment: normalizeTextAlignment(headerAlignment), sortable };
          return { ...w, gridColumns: cols };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Add a row at the bottom of the grid preview data. */
  addGridRow(cellId: string, widgetId: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          if (w.type !== WIDGET_TYPE_GRID) return w;
          const cols = w.gridColumns ?? [];
          const newRow: Record<string, unknown> = {};
          cols.forEach((col) => { const key = col.activityDataProperty ?? (col.columnName?.trim() || col.id); newRow[key] = ''; });
          const data = w.gridDataSourcePreview ?? [];
          return { ...w, gridDataSourcePreview: [...data, newRow] };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedWidgetLabel(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    label: string
  ): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== parentCellId) return c;
        return this.updateWidgetInCell(c, parentWidgetId, (w) => {
          if (w.type !== WIDGET_TYPE_TABLE || !w.nestedTable) return w;
          return { ...w, nestedTable: this.updateNestedTableWidget(w.nestedTable, nestedCellId, nestedWidgetId, (nw) => ({ ...nw, label })) };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetOptions(cellId: string, widgetId: string, options: string[]): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          const prev = w.optionBindings ?? [];
          const optionBindings: string[] = options.map((_, i) => prev[i] ?? '');
          return { ...w, options, optionBindings };
        });
      }),
    }));
    this.state.set({ rows });
  }

  updateValueBinding(cellId: string, widgetId: string, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : undefined;
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => (c.id !== cellId ? c : this.updateWidgetInCell(c, widgetId, (w) => ({ ...w, valueBinding: binding })))),
    }));
    this.state.set({ rows });
  }

  updateOptionBinding(cellId: string, widgetId: string, optionIndex: number, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : '';
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        return this.updateWidgetInCell(c, widgetId, (w) => {
          const opts = w.options ?? [];
          const prev = w.optionBindings ?? [];
          const optionBindings: string[] = opts.map((_, i) => (i === optionIndex ? binding : (prev[i] ?? '')));
          return { ...w, optionBindings };
        });
      }),
    }));
    this.state.set({ rows });
  }

  /** Removes the widget with the given id from the cell. */
  removeWidget(cellId: string, widgetId: string): void {
    this.pushHistory();
    if (this.selectedCellId() === cellId) {
      this.selectedCellId.set(null);
      this.selectedOptionIndex.set(null);
    }
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId) return c;
        const currentWidgets = getCanvasCellWidgets(c).filter((w) => w.id !== widgetId);
        return { ...c, widgets: currentWidgets };
      }),
    }));
    this.state.set({ rows });
  }

  /** Moves a widget from one cell to another; target cell gets the widget appended (stacked). */
  moveWidget(fromCellId: string, toCellId: string, widget: WidgetInstance): void {
    if (fromCellId === toCellId) return;
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id === fromCellId) {
          const currentWidgets = getCanvasCellWidgets(c).filter((w) => w.id !== widget.id);
          return { ...c, widgets: currentWidgets };
        }
        if (c.id === toCellId) {
          const currentWidgets = getCanvasCellWidgets(c);
          return { ...c, widgets: [...currentWidgets, widget] };
        }
        return c;
      }),
    }));
    this.state.set({ rows });
  }

  mergeCells(originRow: number, originCol: number, endRow: number, endCol: number): void {
    this.pushHistory();
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
    this.pushHistory();
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

  /** Returns a deep copy of the current canvas state for saving. */
  getState(): CanvasState {
    return JSON.parse(JSON.stringify(this.state()));
  }

  /**
   * Returns state for save/download/publish with bindings as JSON paths (not "{{ path }}").
   * Use this when persisting layout so output has the path in the binding, not the template form.
   */
  getStateForSave(): CanvasState {
    const raw = this.getState();
    const normalizeWidget = (w: WidgetInstance): WidgetInstance => {
      const next: WidgetInstance = { ...w };
      if (next.valueBinding != null) {
        const path = parseBindingProperty(next.valueBinding);
        next.valueBinding = path || undefined;
      }
      if (next.optionBindings?.length) {
        next.optionBindings = next.optionBindings.map((b) => parseBindingProperty(b) || b);
      }
      if (next.type === WIDGET_TYPE_GRID && next.gridColumns?.length) {
        next.gridColumns = next.gridColumns.map((col) => ({
          ...col,
          valueBinding: col.valueBinding != null ? (parseBindingProperty(col.valueBinding) || col.valueBinding) : undefined,
        }));
      }
      return next;
    };
    const normalizeNestedCell = (nc: NestedTableCell): NestedTableCell => {
      const cell: NestedTableCell = { ...nc, widgets: getNestedCellWidgets(nc).map((w) => normalizeWidget(w)) };
      for (let i = 0; i < cell.widgets.length; i++) {
        const w = cell.widgets[i];
        if (w?.type === WIDGET_TYPE_TABLE && w.nestedTable?.rows) {
          cell.widgets[i] = {
            ...w,
            nestedTable: {
              ...w.nestedTable,
              rows: w.nestedTable.rows.map((r) => ({
                ...r,
                cells: r.cells.map(normalizeNestedCell),
              })),
            },
          } as WidgetInstance;
        }
      }
      return cell;
    };
    const normalizeCell = (c: CanvasCell): CanvasCell => {
      const cell: CanvasCell = { ...c, widgets: getCanvasCellWidgets(c).map((w) => normalizeWidget(w)) };
      for (let i = 0; i < cell.widgets.length; i++) {
        const w = cell.widgets[i];
        if (w?.type === WIDGET_TYPE_TABLE && w.nestedTable?.rows) {
          cell.widgets[i] = {
            ...w,
            nestedTable: {
              ...w.nestedTable,
              rows: w.nestedTable.rows.map((r) => ({
                ...r,
                cells: r.cells.map(normalizeNestedCell),
              })),
            },
          } as WidgetInstance;
        }
      }
      return cell;
    };
    return {
      rows: raw.rows.map((r) => ({
        ...r,
        cells: r.cells.map(normalizeCell),
      })),
    };
  }

  /** Loads a canvas state (replaces current). Clears selection. */
  loadState(state: CanvasState): void {
    const cloned = JSON.parse(JSON.stringify(state)) as CanvasState;
    const normalized = normalizeCanvasState(cloned);
    this.state.set(normalized);
    this.selectedCellId.set(null);
    this.selectedNestedPath.set(null);
    this.selectedOptionIndex.set(null);
  }

  /** Returns a fresh empty canvas state (no layout selected). */
  getDefaultState(): CanvasState {
    return { rows: [] };
  }

  /** Returns the initial layout state: 1 row with 3 empty columns (no components). Use when creating a new layout. */
  getInitialLayoutState(): CanvasState {
    const row = this.createRow(0, 3);
    return { rows: [row] };
  }
}
