import { Component, input, signal, HostBinding, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import type { WidgetInstance } from '../../models/canvas.model';
import { WIDGET_TYPE_GRID } from '../../models/canvas.model';
import { TextAlignment } from '../../enums';
import { BaseWidgetComponent } from '../base-widget.component';

const DEFAULT_COLUMNS = [
  { id: 'col0', columnName: 'column1', headerName: 'Column 1' },
  { id: 'col1', columnName: 'column2', headerName: 'Column 2' },
  { id: 'col2', columnName: 'column3', headerName: 'Column 3' },
];
const PLACEHOLDER_ROW = [{ placeholder: 'No data' }];

@Component({
  selector: 'app-widget-grid',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './widget-grid.component.html',
  styleUrl: './widget-grid.component.scss',
})
export class WidgetGridComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();

  /** When set, the column at this index is selected (e.g. for right-panel editing). */
  readonly selectedColumnIndex = input<number | null>(null);

  /** Column index being hovered; used for per-column hover outline. */
  readonly hoveredColumnIndex = signal<number | null>(null);

  /** Columns to display: from widget.gridColumns or one default column. */
  readonly columns = computed(() => {
    const w = this.widget();
    const list = w?.type === WIDGET_TYPE_GRID && w.gridColumns?.length ? w.gridColumns : DEFAULT_COLUMNS;
    return list;
  });

  /** Column ids for matColumnDef and displayedColumns. */
  readonly displayedColumns = computed(() => this.columns().map((c) => c.columnName));

  /** Key used to read cell value from row; uses activityDataProperty when column is bound to activities. */
  getDisplayKey(col: { columnName: string; activityDataProperty?: string }): string {
    return col.activityDataProperty ?? col.columnName;
  }

  /** CSS class(es) for column cells; adds grid-col-selected when selected, grid-col-hovered on hover. */
  getColumnClass(col: Record<string, unknown>, columnIndex: number): string {
    const base = (col['className'] as string) ?? '';
    const selected = this.selectedColumnIndex() === columnIndex ? ' grid-col-selected' : '';
    const hovered = this.hoveredColumnIndex() === columnIndex ? ' grid-col-hovered' : '';
    return base + selected + hovered;
  }

  setColumnHover(index: number | null): void {
    this.hoveredColumnIndex.set(index);
  }

  /** JSON path for data-grid attribute (grid-level binding, e.g. amsInformation.arrangements[0].amsActivity.activities). */
  getGridBindingPath(): string | null {
    const w = this.widget();
    return w?.type === WIDGET_TYPE_GRID ? this.getPropertyBinding(w.valueBinding) : null;
  }

  /** JSON path for data-grid-column attribute (column binding; when activities, path is valueBinding.activityDataProperty). */
  getColumnBindingPath(col: Record<string, unknown>): string | null {
    const valueBinding = col?.['valueBinding'] as string | undefined;
    if (!valueBinding) return null;
    const activityDataProperty = col?.['activityDataProperty'] as string | undefined;
    if (activityDataProperty) return `${valueBinding}.${activityDataProperty}`;
    return valueBinding;
  }

  /** Text alignment for column cells. */
  getColumnAlignment(col: Record<string, unknown>): string {
    const a = col['alignment'];
    return (a === TextAlignment.Left || a === TextAlignment.Center || a === TextAlignment.Right)
      ? a
      : TextAlignment.Left;
  }

  /** Data source: uses widget.gridDataSourcePreview when defined, otherwise placeholder. */
  readonly dataSource = new MatTableDataSource<Record<string, unknown>>(PLACEHOLDER_ROW);

  /** Total row: first column shows "Total", numeric columns show sum. Only when we have real data (not placeholder). */
  readonly totalRow = computed(() => {
    const w = this.widget();
    const data = w?.type === WIDGET_TYPE_GRID && w.gridDataSourcePreview?.length ? w.gridDataSourcePreview : null;
    if (!data?.length || data.some((r) => 'placeholder' in r)) return null;
    const cols = this.columns();
    const row: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      const key = this.getDisplayKey(col);
      if (i === 0) {
        row[key] = 'Total';
        return;
      }
      const values = data.map((r) => r[key]);
      const nums = values
        .map((v) => {
          if (typeof v === 'number' && !Number.isNaN(v)) return v;
          if (typeof v === 'string') return parseFloat(String(v).replace(/,/g, '')) || null;
          return null;
        })
        .filter((n): n is number => n !== null && !Number.isNaN(n));
      row[key] = nums.length ? nums.reduce((a, b) => a + b, 0) : '—';
    });
    return row;
  });

  constructor() {
    super();
    effect(() => {
      const w = this.widget();
      const data = w?.type === WIDGET_TYPE_GRID && w.gridDataSourcePreview?.length
        ? w.gridDataSourcePreview
        : PLACEHOLDER_ROW;
      this.dataSource.data = data;
    });
  }

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
