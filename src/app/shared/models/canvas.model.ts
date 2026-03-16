/** Re-export enums from shared location. */
import type { TextAlignmentType } from '../enums';
export {
  ACTIVITIES_BINDING_PATHS,
  GridAction,
  LayoutAction,
  LayoutDropPosition,
  LayoutOption,
  SelectedTarget,
  TextAlignment,
  ValidatorKey,
} from '../enums';
export type {
  GridActionType,
  LayoutActionType,
  LayoutDropPositionType,
  LayoutOptionType,
  SelectedTargetType,
  TextAlignmentType,
  ValidatorKeyType,
} from '../enums';

export type WidgetType = "input" | "checkbox" | "radio" | "table" | "label" | "grid" | "panel";

/** Option for the property binding dropdown; value is used in {{ value }} inside components. */
export interface BindableProperty {
  value: string;
  label: string;
}

export const WIDGET_LABELS: Record<WidgetType, string> = {
  input: "Input",
  checkbox: "Checkbox",
  radio: "Radio",
  table: "Table",
  label: "Label",
  grid: "Grid",
  panel: "Panel",
};

/** Default label for a new widget of the given type (e.g. "Choose one" for radio). Use when creating widgets. */
export function getDefaultWidgetLabel(type: WidgetType, labelOverride?: string): string {
  if (labelOverride?.trim()) return labelOverride.trim();
  return type === WIDGET_TYPE_RADIO ? 'Choose one' : WIDGET_LABELS[type];
}

/** Ordered list of widget types shown in the palette; single source of truth for builders. */
export const WIDGET_TYPES: WidgetType[] = ["input", "checkbox", "radio", "table", "label", "grid", "panel"];

/** Widget types that have a form control (input, checkbox, radio). */
export const FORM_CONTROL_WIDGET_TYPES: WidgetType[] = ["input", "checkbox", "radio"];

/** Widget type literals for checks (avoids magic strings across the app). */
export const WIDGET_TYPE_TABLE: WidgetType = "table";
export const WIDGET_TYPE_GRID: WidgetType = "grid";
export const WIDGET_TYPE_INPUT: WidgetType = "input";
export const WIDGET_TYPE_RADIO: WidgetType = "radio";
export const WIDGET_TYPE_LABEL: WidgetType = "label";
export const WIDGET_TYPE_CHECKBOX: WidgetType = "checkbox";
export const WIDGET_TYPE_PANEL: WidgetType = "panel";

/** Widget types that show in the right panel Data tab (label, input, checkbox, radio). */
export const DATA_COMPONENT_WIDGET_TYPES: readonly WidgetType[] = [
  WIDGET_TYPE_LABEL,
  WIDGET_TYPE_INPUT,
  WIDGET_TYPE_CHECKBOX,
  WIDGET_TYPE_RADIO,
] as const;

/** Icons for palette items; reusable across admin palette and any other consumer. */
export const WIDGET_PALETTE_ICONS: Record<WidgetType, string> = {
  input: "▭",
  checkbox: "☑",
  radio: "◉",
  table: "⊞",
  label: "Aa",
  grid: "▦",
  panel: "▣",
};

/** Cell that can hold multiple widgets stacked vertically. */
export interface NestedTableCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  /** All widgets in this cell, in drop order (stacked one under the other). */
  widgets: WidgetInstance[];
  /** @deprecated Legacy single widget; normalized to widgets on load. */
  widget?: WidgetInstance | null;
  colSpan?: number;
  rowSpan?: number;
  isMergedOrigin?: boolean;
  /** True when merge was done by typing overflow; false when user clicked Merge. Don't auto-unmerge user merges. */
  autoMerged?: boolean;
  /** Optional CSS class(es) applied to the cell's td */
  className?: string;
}

export interface NestedTableRow {
  id: string;
  cells: NestedTableCell[];
}

export interface NestedTableState {
  rows: NestedTableRow[];
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  label?: string;
  options?: string[]; // for radio
  placeholder?: string;
  colspan?: number;
  rowspan?: number;
  nestedTable?: NestedTableState; // only for type 'table'
  /** Optional header text for the whole grid (table-level). When empty, no table header is shown. */
  gridHeaderText?: string;
  /** Header alignment for the table caption. */
  gridHeaderAlignment?: TextAlignmentType;
  /** Optional footer text for the whole grid (table-level). Shown below Total row. When empty, no footer shown. */
  gridFooterText?: string;
  /** Footer alignment for the table-level footer text. */
  gridFooterAlignment?: TextAlignmentType;
  /** Column definitions for type 'grid' (mat-table). When empty, one default column is shown. */
  gridColumns?: {
    id: string;
    columnName: string;
    headerName?: string;
    headerAlignment?: TextAlignmentType; // per-column header alignment
    valueBinding?: string;
    activityDataProperty?: string;
    className?: string;
    alignment?: TextAlignmentType; // cell alignment
    sortable?: boolean;
  }[];
  /** Preview data for the grid in the builder: array of row objects. Keys should match column columnName. When set, grid shows these rows. */
  gridDataSourcePreview?: Record<string, unknown>[];
  /** Value binding template e.g. "{{ listValue1 }}" for input, checkbox, label */
  valueBinding?: string;
  /** Per-option value bindings for radio, e.g. ["{{ listValue1 }}", "{{ listValue2 }}"] */
  optionBindings?: string[];
  /** Optional CSS class(es) applied to app-widget-renderer host when user clicked the widget wrapper */
  className?: string;
  /** Optional CSS class(es) applied to the inner component (app-widget-input etc.) when user clicked it */
  innerClassName?: string;
  /** Classes for specific child elements; key = data-class-target value (e.g. 'label', 'control', 'option-0') */
  elementClasses?: Record<string, string>;
  /** FormControlName for reactive forms (label, input, checkbox, radio) */
  formControlName?: string;
  /** Reactive-form-style expression controlling when this component is shown. Output as data-visibility-condition. Applies to label, input, checkbox, radio. */
  visibilityCondition?: string;
  /** Min character length (Validators.minlength). Output as data-minlength. */
  minLength?: number;
  /** Max character length (Validators.maxlength). Output as data-maxlength. */
  maxLength?: number;
  /** Min numeric value (Validators.min). Output as data-min. */
  min?: number;
  /** Max numeric value (Validators.max). Output as data-max. */
  max?: number;
  /** Regex pattern (Validators.pattern). Output as data-pattern. */
  pattern?: string;
}

/** Cell that can hold multiple widgets stacked vertically. */
export interface CanvasCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  /** All widgets in this cell, in drop order (stacked one under the other). */
  widgets: WidgetInstance[];
  /** @deprecated Legacy single widget; normalized to widgets on load. */
  widget?: WidgetInstance | null;
  colSpan: number;
  rowSpan: number;
  isMergedOrigin: boolean; // top-left of a merge
  /** Optional CSS class(es) applied to the cell's td */
  className?: string;
}

/**
 * Returns the list of widgets in a canvas cell.
 * Supports legacy state that only has `widget`; use this instead of reading cell.widget or cell.widgets directly.
 */
export function getCanvasCellWidgets(cell: CanvasCell): WidgetInstance[] {
  if (Array.isArray(cell.widgets)) return cell.widgets;
  return cell.widget != null ? [cell.widget] : [];
}

/**
 * Returns the list of widgets in a nested table cell.
 * Supports legacy state that only has `widget`; use this instead of reading cell.widget or cell.widgets directly.
 */
export function getNestedCellWidgets(cell: NestedTableCell): WidgetInstance[] {
  if (Array.isArray(cell.widgets)) return cell.widgets;
  return cell.widget != null ? [cell.widget] : [];
}

/** Returns the first widget in the cell, or null if the cell has no widgets (e.g. for grid/table type checks). */
export function getPrimaryWidget(cell: { widgets?: WidgetInstance[]; widget?: WidgetInstance | null }): WidgetInstance | null {
  const list = Array.isArray(cell.widgets) ? cell.widgets : (cell.widget != null ? [cell.widget] : []);
  return list.length > 0 ? list[0]! : null;
}

/** Returns the widget in the cell with the given id, or the primary widget if id is null/empty or not found. */
export function getWidgetByIdOrPrimary(cell: { widgets?: WidgetInstance[]; widget?: WidgetInstance | null } | null, widgetId: string | null): WidgetInstance | null {
  if (!cell) return null;
  const list = Array.isArray(cell.widgets) ? cell.widgets : (cell.widget != null ? [cell.widget] : []);
  if (widgetId && list.length > 0) {
    const found = list.find((w) => w.id === widgetId);
    if (found) return found;
  }
  return list.length > 0 ? list[0]! : null;
}

export interface CanvasRow {
  id: string;
  cells: CanvasCell[];
}

export interface CanvasState {
  rows: CanvasRow[];
}
