/** Re-export enums from shared location. */
export {
  ACTIVITIES_BINDING_PATHS,
  LayoutAction,
  LayoutDropPosition,
  LayoutOption,
  SelectedTarget,
  TextAlignment,
  ValidatorKey,
} from '../enums';
export type {
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
  return type === 'radio' ? 'Choose one' : WIDGET_LABELS[type];
}

/** Ordered list of widget types shown in the palette; single source of truth for builders. */
export const WIDGET_TYPES: WidgetType[] = ["input", "checkbox", "radio", "table", "label", "grid", "panel"];

/** Widget types that have a form control (input, checkbox, radio). */
export const FORM_CONTROL_WIDGET_TYPES: WidgetType[] = ["input", "checkbox", "radio"];

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

export interface NestedTableCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  widget: WidgetInstance | null;
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
  /** Column definitions for type 'grid' (mat-table). When empty, one default column is shown. */
  gridColumns?: { id: string; columnName: string; headerName: string; valueBinding?: string; activityDataProperty?: string; className?: string; alignment?: 'left' | 'center' | 'right' }[];
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

export interface CanvasCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  widget: WidgetInstance | null;
  colSpan: number;
  rowSpan: number;
  isMergedOrigin: boolean; // top-left of a merge
  /** Optional CSS class(es) applied to the cell's td */
  className?: string;
}

export interface CanvasRow {
  id: string;
  cells: CanvasCell[];
}

export interface CanvasState {
  rows: CanvasRow[];
}
