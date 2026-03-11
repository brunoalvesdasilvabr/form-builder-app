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
import { computeMergeRange, canMergeFromRange } from '../../shared/utils/grid-selection.util';
import { ACTIVITIES_BINDING_PATHS, TextAlignment, ValidatorKey } from '../../shared/enums';
import { getDefaultWidgetLabel, FORM_CONTROL_WIDGET_TYPES } from '../../shared/models/canvas.model';
import * as gridMerge from '../../shared/utils/grid-merge.util';
import { generateId } from '../../shared/utils/id.util';
import { createDefaultNestedTable } from '../../shared/utils/nested-table.util';
import { parseBindingProperty } from '../../shared/utils/binding.util';

const UNDO_LIMIT = 50;

/** Returns trimmed string or undefined if empty. */
function trimOrUndefined(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
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
  /** Nested cell selection: parent canvas cell + table widget + nested cell id */
  readonly selectedNestedPath = signal<{ parentCellId: string; parentWidgetId: string; nestedCellId: string } | null>(null);
  /** What was clicked: 'cell' = td, 'widget' = app-widget-renderer host, 'widget-inner' = inner component, 'element' = child element */
  readonly selectedTarget = signal<'cell' | 'widget' | 'widget-inner' | 'element'>('cell'); // uses SelectedTarget values
  /** When selectedTarget is 'element', the data-class-target key (e.g. 'label', 'control', 'option-0') */
  readonly selectedElementKey = signal<string | null>(null);

  readonly selectedCell = computed(() => {
    const nested = this.selectedNestedPath();
    if (nested) {
      const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === nested.parentCellId);
      const table = parent?.widget?.type === 'table' ? parent.widget : null;
      const nestedRows = table?.nestedTable?.rows ?? [];
      for (const row of nestedRows) {
        const cell = row.cells.find((c) => c.id === nested.nestedCellId);
        if (cell) return cell as unknown as CanvasCell;
      }
      return null;
    }
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
    target: 'cell' | 'widget' | 'widget-inner' | 'element' = 'cell',
    elementKey?: string
  ): void {
    this.selectedCellId.set(cellId);
    this.selectedNestedPath.set(null);
    this.nestedSelectionPath.set(null);
    this.nestedSelectionCells.set([]);
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === 'element' ? (elementKey ?? null) : null);
    this.selectedOptionIndex.set(null);
    if (!cellId) {
      this.selectedGridColumnIndex.set(null);
    } else {
      const cell = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === cellId);
      if (cell?.widget?.type !== 'grid') this.selectedGridColumnIndex.set(null);
    }
  }

  setSelectedNestedCell(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    target: 'cell' | 'widget' | 'widget-inner' | 'element' = 'cell',
    elementKey?: string
  ): void {
    this.selectedCellId.set(null);
    this.selectedNestedPath.set({ parentCellId, parentWidgetId, nestedCellId });
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === 'element' ? (elementKey ?? null) : null);
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
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, className: trimOrUndefined(className) } };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetInnerClass(cellId: string, widgetId: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, innerClassName: trimOrUndefined(className) } };
      }),
    }));
    this.state.set({ rows });
  }

  updateWidgetElementClass(cellId: string, widgetId: string, elementKey: string, className: string): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        const prev = c.widget.elementClasses ?? {};
        const next = { ...prev };
        const val = trimOrUndefined(className);
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

  /** Updates for nested table cells (inside a table widget). */
  updateNestedCellClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => nc.id === nestedCellId ? { ...nc, className: trimOrUndefined(className) } : nc),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateNestedWidgetClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, className: trimOrUndefined(className) } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateNestedWidgetInnerClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, innerClassName: trimOrUndefined(className) } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateNestedWidgetElementClass(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, elementKey: string, className: string): void {
    this.pushHistory();
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              const prev = nc.widget.elementClasses ?? {};
              const next = { ...prev };
              const val = trimOrUndefined(className);
              if (val) next[elementKey] = val;
              else delete next[elementKey];
              return { ...nc, widget: { ...nc.widget, elementClasses: Object.keys(next).length ? next : undefined } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateNestedValueBinding(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : undefined;
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, valueBinding: binding } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateNestedOptionBinding(parentCellId: string, parentWidgetId: string, nestedCellId: string, nestedWidgetId: string, optionIndex: number, propertyName: string): void {
    this.pushHistory();
    const binding = propertyName ? `{{ ${propertyName} }}` : '';
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              const opts = nc.widget.options ?? [];
              const prev = nc.widget.optionBindings ?? [];
              const optionBindings = opts.map((_, i) => (i === optionIndex ? binding : (prev[i] ?? '')));
              return { ...nc, widget: { ...nc.widget, optionBindings } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateWidgetFormControlName(cellId: string, widgetId: string, formControlName: string): void {
    this.pushHistory();
    const val = trimOrUndefined(formControlName);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, formControlName: val } };
      }),
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
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, formControlName: val } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateWidgetVisibilityCondition(cellId: string, widgetId: string, visibilityCondition: string): void {
    this.pushHistory();
    const val = trimOrUndefined(visibilityCondition);
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, visibilityCondition: val } };
      }),
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
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, visibilityCondition: val } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
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
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, [key]: value } };
      }),
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
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        return { ...c, widget: { ...c.widget, pattern: val } };
      }),
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
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, [key]: value } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
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
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              return { ...nc, widget: { ...nc.widget, pattern: val } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  createRow(rowIndex: number, colCount: number): CanvasRow {
    const cells: CanvasCell[] = [];
    for (let c = 0; c < colCount; c++) {
      cells.push({
        id: generateId('id'),
        rowIndex,
        colIndex: c,
        widget: null,
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
        widget: null,
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

  /** Remove the row at the given index. Requires at least 2 rows. */
  removeRowAt(rowIndex: number): boolean {
    const rows = this.state().rows;
    if (rows.length <= 1) return false;
    if (rowIndex < 0 || rowIndex >= rows.length) return false;
    this.pushHistory();
    const next = rows.filter((_, i) => i !== rowIndex).map((r, ri) => ({
      ...r,
      cells: r.cells.map((c, ci) => ({ ...c, rowIndex: ri, colIndex: ci })),
    }));
    this.state.set({ rows: next });
    return true;
  }

  /** Remove the column at the given index. Requires at least 2 columns. */
  removeColumnAt(colIndex: number): boolean {
    const rows = this.state().rows;
    const colCount = rows[0]?.cells.length ?? 0;
    if (colCount <= 1) return false;
    if (colIndex < 0 || colIndex >= colCount) return false;
    this.pushHistory();
    const next = rows.map((row, ri) => {
      const cells = row.cells.filter((_, ci) => ci !== colIndex).map((c, ci) => ({
        ...c,
        rowIndex: ri,
        colIndex: ci,
      }));
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
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === path.parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nestedRows = table?.nestedTable?.rows ?? [];
    for (const row of nestedRows) {
      const cell = row.cells.find((c) => c.id === path.nestedCellId);
      if (cell) return { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
    }
    return null;
  }

  /** Row and column count of a nested table. */
  getNestedTableSize(parentCellId: string, parentWidgetId: string): { rowCount: number; colCount: number } | null {
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nested = table?.nestedTable?.rows;
    if (!nested?.length) return null;
    return { rowCount: nested.length, colCount: nested[0].cells.length };
  }

  removeNestedRowAt(parentCellId: string, parentWidgetId: string, rowIndex: number): boolean {
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nested = table?.nestedTable?.rows;
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
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nested = table?.nestedTable?.rows;
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
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === path.parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nested = table?.nestedTable?.rows;
    if (!nested) return;
    this.pushHistory();
    const mergedRows = gridMerge.mergeCells(nested as gridMerge.MergeableRow[], range.r0, range.c0, range.r1, range.c1);
    this.updateNestedTable(path.parentCellId, path.parentWidgetId, { rows: mergedRows as NestedTableRow[] });
    this.clearNestedSelection();
  }

  deleteNestedSelection(): void {
    const path = this.nestedSelectionPath();
    const cells = this.nestedSelectionCells();
    if (!path || !cells.length) return;
    const parent = this.state().rows.flatMap((r) => r.cells).find((c) => c.id === path.parentCellId);
    const table = parent?.widget?.type === 'table' ? parent.widget : null;
    const nested = table?.nestedTable?.rows;
    if (!nested) return;
    this.pushHistory();
    const keysSet = new Set(cells);
    const newRows = nested.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        const key = `${c.rowIndex},${c.colIndex}`;
        return keysSet.has(key) ? { ...c, widget: null } : c;
      }),
    })) as NestedTableRow[];
    this.updateNestedTable(path.parentCellId, path.parentWidgetId, { rows: newRows });
    this.clearNestedSelection();
  }

  deleteCanvasSelection(selectionCells: string[]): void {
    if (!selectionCells.length) return;
    const keysSet = new Set(selectionCells);
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        const key = `${c.rowIndex},${c.colIndex}`;
        return keysSet.has(key) ? { ...c, widget: null } : c;
      }),
    }));
    this.state.set({ rows });
    this.clearCanvasSelection();
  }

  createDefaultNestedTable(): NestedTableState {
    return createDefaultNestedTable('id');
  }

  /** All form control names from inputs/checkbox/radio in the layout (top-level and nested). */
  getControlNamesInLayout(): string[] {
    const set = new Set<string>();
    const addFromRows = (rows: { cells: { widget: WidgetInstance | null }[] }[]): void => {
      for (const row of rows) {
        for (const cell of row.cells) {
          const w = cell.widget;
          if (w && FORM_CONTROL_WIDGET_TYPES.includes(w.type) && w.formControlName?.trim()) {
            set.add(w.formControlName.trim());
          }
          if (w?.type === 'table' && w.nestedTable?.rows?.length) {
            addFromRows(w.nestedTable.rows);
          }
        }
      }
    };
    addFromRows(this.state().rows);
    return Array.from(set).sort();
  }

  /** Default 3 columns for new grid widgets. */
  private createDefaultGridColumns(): { id: string; columnName: string; headerName: string }[] {
    return [
      { id: generateId('id'), columnName: 'column1', headerName: 'Column 1' },
      { id: generateId('id'), columnName: 'column2', headerName: 'Column 2' },
      { id: generateId('id'), columnName: 'column3', headerName: 'Column 3' },
    ];
  }

  /** When canvas is empty, creates initial row and sets the widget. Use for first drop on empty state. */
  setWidgetOnEmptyCanvas(type: WidgetType, label?: string, options?: string[]): void {
    const rows = this.state().rows;
    if (rows.length > 0) return;
    this.pushHistory();
    const newRow = this.createRow(0, 1);
    const cell = newRow.cells[0]!;
    const widget: WidgetInstance = {
      id: generateId('id'),
      type,
      label: getDefaultWidgetLabel(type, label),
      options: options ?? (type === 'radio' ? ['Option 1', 'Option 2'] : undefined),
      placeholder: type === 'input' ? 'Enter text...' : undefined,
    };
    if (type === 'table') {
      (widget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable = this.createDefaultNestedTable();
    }
    if (type === 'grid') {
      (widget as WidgetInstance & { gridColumns: { id: string; columnName: string; headerName: string }[] }).gridColumns = this.createDefaultGridColumns();
    }
    const updatedRow = { ...newRow, cells: [{ ...cell, widget }] };
    this.state.set({ rows: [updatedRow] });
  }

  setWidgetAt(rowIndex: number, colIndex: number, type: WidgetType, label?: string, options?: string[]): void {
    this.pushHistory();
    const rows = this.state().rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri !== rowIndex || ci !== colIndex) return cell;
        const widget: WidgetInstance = {
          id: generateId('id'),
          type,
          label: getDefaultWidgetLabel(type, label),
          options: options ?? (type === 'radio' ? ['Option 1', 'Option 2'] : undefined),
          placeholder: type === 'input' ? 'Enter text...' : undefined,
        };
        if (type === 'table') {
          (widget as WidgetInstance & { nestedTable: NestedTableState }).nestedTable = this.createDefaultNestedTable();
        }
        if (type === 'grid') {
          (widget as WidgetInstance & { gridColumns: { id: string; columnName: string; headerName: string }[] }).gridColumns = this.createDefaultGridColumns();
        }
        return { ...cell, widget };
      }),
    }));
    this.state.set({ rows });
  }

  updateNestedTable(cellId: string, widgetId: string, state: NestedTableState): void {
    this.pushHistory();
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
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId) return c;
        const w = c.widget;
        const updates = { label };
        return { ...c, widget: { ...w, ...updates } };
      }),
    }));
    this.state.set({ rows });
  }

  /** Set preview data for a grid widget. Row objects’ keys should match column columnName. */
  updateGridDataSourcePreview(cellId: string, widgetId: string, data: Record<string, unknown>[]): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId || c.widget.type !== 'grid') return c;
        return { ...c, widget: { ...c.widget, gridDataSourcePreview: data } };
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
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId || c.widget.type !== 'grid') return c;
        const cols = c.widget.gridColumns ?? [];
        const n = cols.length + 1;
        const newCol = { id: generateId('id'), columnName: `column${n}`, headerName: `Column ${n}` };
        return { ...c, widget: { ...c.widget, gridColumns: [...cols, newCol] } };
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
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId || c.widget.type !== 'grid') return c;
        const cols = [...(c.widget.gridColumns ?? [])];
        if (columnIndex < 0 || columnIndex >= cols.length) return c;
        const col = cols[columnIndex];
        const newCol = valueBinding
          ? {
              ...col,
              valueBinding,
              activityDataProperty: isActivities ? activityDataProperty : undefined,
              headerName: isActivities && headerLabel ? headerLabel : col.headerName,
            }
          : { ...col, valueBinding: undefined, activityDataProperty: undefined };
        cols[columnIndex] = newCol;
        const newWidget = { ...c.widget, gridColumns: cols };
        if (sampleData?.length) {
          (newWidget as WidgetInstance & { gridDataSourcePreview: Record<string, unknown>[] }).gridDataSourcePreview = sampleData;
        }
        return { ...c, widget: newWidget };
      }),
    }));
    this.state.set({ rows });
  }

  /** Update column class and alignment for a grid column. */
  updateGridColumnClassAndAlignment(cellId: string, widgetId: string, columnIndex: number, className: string, alignment: 'left' | 'center' | 'right' | ''): void {
    this.pushHistory();
    const rows = this.state().rows.map((row) => ({
      ...row,
      cells: row.cells.map((c) => {
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId || c.widget.type !== 'grid') return c;
        const cols = [...(c.widget.gridColumns ?? [])];
        if (columnIndex < 0 || columnIndex >= cols.length) return c;
        const col = cols[columnIndex];
        cols[columnIndex] = {
          ...col,
          className: trimOrUndefined(className),
          alignment: (alignment === TextAlignment.Left || alignment === TextAlignment.Center || alignment === TextAlignment.Right) ? alignment : undefined,
        };
        return { ...c, widget: { ...c.widget, gridColumns: cols } };
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
        if (c.id !== cellId || !c.widget || c.widget.id !== widgetId || c.widget.type !== 'grid') return c;
        const cols = c.widget.gridColumns ?? [];
        const newRow: Record<string, unknown> = {};
        cols.forEach((col) => { newRow[col.columnName] = ''; });
        const data = c.widget.gridDataSourcePreview ?? [];
        return { ...c, widget: { ...c.widget, gridDataSourcePreview: [...data, newRow] } };
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
    this.state.update((s) => {
      const rows = s.rows.map((row) => ({
        ...row,
        cells: row.cells.map((c) => {
          if (c.id !== parentCellId || !c.widget || c.widget.id !== parentWidgetId || c.widget.type !== 'table') return c;
          const nested = c.widget.nestedTable;
          if (!nested?.rows) return c;
          const nestedRows = nested.rows.map((r) => ({
            ...r,
            cells: r.cells.map((nc) => {
              if (nc.id !== nestedCellId || !nc.widget || nc.widget.id !== nestedWidgetId) return nc;
              const w = nc.widget;
              const updates = { label };
              return { ...nc, widget: { ...w, ...updates } };
            }),
          }));
          return { ...c, widget: { ...c.widget, nestedTable: { rows: nestedRows } } };
        }),
      }));
      return { rows };
    });
  }

  updateWidgetOptions(cellId: string, widgetId: string, options: string[]): void {
    this.pushHistory();
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
    this.pushHistory();
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
    this.pushHistory();
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
    this.pushHistory();
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
    this.pushHistory();
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
      if (next.type === 'grid' && next.gridColumns?.length) {
        next.gridColumns = next.gridColumns.map((col) => ({
          ...col,
          valueBinding: col.valueBinding != null ? (parseBindingProperty(col.valueBinding) || col.valueBinding) : undefined,
        }));
      }
      return next;
    };
    const normalizeCell = (c: CanvasCell): CanvasCell => {
      const cell: CanvasCell = { ...c };
      if (cell.widget) cell.widget = normalizeWidget(cell.widget);
      if (cell.widget?.type === 'table' && cell.widget.nestedTable?.rows) {
        const nested = cell.widget.nestedTable;
        cell.widget = {
          ...cell.widget,
          nestedTable: {
            ...nested,
            rows: nested.rows.map((r) => ({
              ...r,
              cells: r.cells.map((nc) => normalizeCell(nc as CanvasCell) as NestedTableCell),
            })),
          },
        };
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
    this.state.set(JSON.parse(JSON.stringify(state)));
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
