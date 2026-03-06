import { Injectable, signal, computed } from '@angular/core';
import type { CanvasState, CanvasRow, CanvasCell, WidgetInstance, WidgetType, NestedTableState, NestedTableRow, NestedTableCell, BindableProperty } from '../../shared/models/canvas.model';
import { getDefaultWidgetLabel } from '../../shared/models/canvas.model';
import * as gridMerge from '../../shared/utils/grid-merge.util';
import { generateId } from '../../shared/utils/id.util';
import { createDefaultNestedTable } from '../../shared/utils/nested-table.util';

const UNDO_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private readonly state = signal<CanvasState>({
    rows: [
      this.createRow(0, 3),
    ],
  });

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
  readonly selectedTarget = signal<'cell' | 'widget' | 'widget-inner' | 'element'>('cell');
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

  setSelectedCell(
    cellId: string | null,
    target: 'cell' | 'widget' | 'widget-inner' | 'element' = 'cell',
    elementKey?: string
  ): void {
    this.selectedCellId.set(cellId);
    this.selectedNestedPath.set(null);
    this.selectedTarget.set(target);
    this.selectedElementKey.set(target === 'element' ? (elementKey ?? null) : null);
    this.selectedOptionIndex.set(null);
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
      cells: row.cells.map((c) =>
        c.id === cellId ? { ...c, className: className.trim() || undefined } : c
      ),
    }));
    this.state.set({ rows });
  }

  updateWidgetClass(cellId: string, widgetId: string, className: string): void {
    this.pushHistory();
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
    this.pushHistory();
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
    this.pushHistory();
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
            cells: r.cells.map((nc) => nc.id === nestedCellId ? { ...nc, className: className.trim() || undefined } : nc),
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
              return { ...nc, widget: { ...nc.widget, className: className.trim() || undefined } };
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
              return { ...nc, widget: { ...nc.widget, innerClassName: className.trim() || undefined } };
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
              const val = className.trim();
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
    const val = formControlName.trim() || undefined;
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
    const val = formControlName.trim() || undefined;
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
    const val = visibilityCondition.trim() || undefined;
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
    const val = visibilityCondition.trim() || undefined;
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
    key: 'minLength' | 'maxLength' | 'min' | 'max',
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
    this.updateWidgetValidatorValue(cellId, widgetId, 'minLength', value);
  }

  updateWidgetMaxLength(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, 'maxLength', value);
  }

  updateWidgetMin(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, 'min', value);
  }

  updateWidgetMax(cellId: string, widgetId: string, value: number | undefined): void {
    this.updateWidgetValidatorValue(cellId, widgetId, 'max', value);
  }

  updateWidgetPattern(cellId: string, widgetId: string, value: string | undefined): void {
    this.pushHistory();
    const val = (value?.trim() || undefined) as string | undefined;
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
    key: 'minLength' | 'maxLength' | 'min' | 'max',
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
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, 'minLength', value);
  }

  updateNestedWidgetMaxLength(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, 'maxLength', value);
  }

  updateNestedWidgetMin(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, 'min', value);
  }

  updateNestedWidgetMax(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: number | undefined
  ): void {
    this.updateNestedWidgetValidatorValue(parentCellId, parentWidgetId, nestedCellId, nestedWidgetId, 'max', value);
  }

  updateNestedWidgetPattern(
    parentCellId: string,
    parentWidgetId: string,
    nestedCellId: string,
    nestedWidgetId: string,
    value: string | undefined
  ): void {
    this.pushHistory();
    const val = value?.trim() || undefined;
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

  addRow(): void {
    this.pushHistory();
    const rows = [...this.state().rows];
    const colCount = rows[0]?.cells.length ?? 3;
    rows.push(this.createRow(rows.length, colCount));
    this.state.set({ rows });
  }

  addColumn(): void {
    this.pushHistory();
    const rows = this.state().rows.map((row, ri) => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: generateId('id'),
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
    this.pushHistory();
    const rows = this.state().rows;
    if (rows.length <= 1) return;
    this.state.set({ rows: rows.slice(0, -1) });
  }

  removeColumn(): void {
    this.pushHistory();
    const rows = this.state().rows;
    if (!rows.length || rows[0].cells.length <= 1) return;
    this.state.set({
      rows: rows.map((row) => ({
        ...row,
        cells: row.cells.slice(0, -1),
      })),
    });
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
          if (w && ['input', 'checkbox', 'radio'].includes(w.type) && w.formControlName?.trim()) {
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

  /** Loads a canvas state (replaces current). Clears selection. */
  loadState(state: CanvasState): void {
    this.state.set(JSON.parse(JSON.stringify(state)));
    this.selectedCellId.set(null);
    this.selectedNestedPath.set(null);
    this.selectedOptionIndex.set(null);
  }

  /** Returns a fresh default canvas state (one row, three cells). */
  getDefaultState(): CanvasState {
    return { rows: [this.createRow(0, 3)] };
  }
}
