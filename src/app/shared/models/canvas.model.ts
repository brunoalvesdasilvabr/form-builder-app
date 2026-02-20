export type WidgetType = "input" | "checkbox" | "radio" | "table" | "label";

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
};

/** Ordered list of widget types shown in the palette; single source of truth for builders. */
export const WIDGET_TYPES: WidgetType[] = ["input", "checkbox", "radio", "table", "label"];

/** Icons for palette items; reusable across admin palette and any other consumer. */
export const WIDGET_PALETTE_ICONS: Record<WidgetType, string> = {
  input: "▭",
  checkbox: "☑",
  radio: "◉",
  table: "⊞",
  label: "Aa",
};

export interface NestedTableCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  widget: WidgetInstance | null;
  colSpan?: number;
  rowSpan?: number;
  isMergedOrigin?: boolean;
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
