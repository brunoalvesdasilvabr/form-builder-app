export type WidgetType = 'input' | 'checkbox' | 'radio' | 'table' | 'label';

export const WIDGET_LABELS: Record<WidgetType, string> = {
  input: 'Input',
  checkbox: 'Checkbox',
  radio: 'Radio',
  table: 'Table',
  label: 'Label',
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
}

export interface CanvasCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  widget: WidgetInstance | null;
  colSpan: number;
  rowSpan: number;
  isMergedOrigin: boolean; // top-left of a merge
}

export interface CanvasRow {
  id: string;
  cells: CanvasCell[];
}

export interface CanvasState {
  rows: CanvasRow[];
}
