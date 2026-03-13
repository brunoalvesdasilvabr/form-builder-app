import { Component, input, signal, HostBinding, computed, effect, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import type { WidgetInstance } from '../../models/canvas.model';
import { WIDGET_TYPE_GRID } from '../../models/canvas.model';
import { TextAlignment } from '../../enums';
import { BaseWidgetComponent } from '../base-widget.component';

const DEFAULT_COLUMNS = [
  { id: 'col0', columnName: '' },
  { id: 'col1', columnName: '' },
  { id: 'col2', columnName: '' },
];
const PLACEHOLDER_ROW = [{ placeholder: 'No data' }];

@Component({
  selector: 'app-widget-grid',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule],
  templateUrl: './widget-grid.component.html',
  styleUrl: './widget-grid.component.scss',
})
export class WidgetGridComponent extends BaseWidgetComponent implements AfterViewInit {
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

  /** Column ids for matColumnDef and displayedColumns. Uses columnName when set, else col id. */
  readonly displayedColumns = computed(() => this.columns().map((c) => this.getColumnDef(c)));

  /** True when at least one column has a column name (so header row should be shown). */
  readonly showHeaderRow = computed(() =>
    this.columns().some((c) => (c.columnName ?? '').trim().length > 0)
  );

  /** True when the column has a column name (so its header cell should be shown). */
  hasColumnName(col: { columnName?: string }): boolean {
    return (col.columnName ?? '').trim().length > 0;
  }

  /** Unique column def for mat-table. Uses columnName when non-empty, else col.id. */
  getColumnDef(col: { id: string; columnName?: string }): string {
    const name = (col.columnName ?? '').trim();
    return name || col.id;
  }

  /** Key used to read cell value from row; uses activityDataProperty when bound to activities, else columnName or col id. */
  getDisplayKey(col: { id: string; columnName?: string; activityDataProperty?: string }): string {
    return col.activityDataProperty ?? this.getColumnDef(col);
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

  /** True when this column is sortable. */
  isColumnSortable(col: Record<string, unknown>): boolean {
    return !!col['sortable'];
  }

  /** Header cell alignment. */
  getHeaderAlignment(col: Record<string, unknown>): string {
    const a = col['headerAlignment'];
    return (a === TextAlignment.Left || a === TextAlignment.Center || a === TextAlignment.Right)
      ? a
      : TextAlignment.Left;
  }

  /** Total row cell content: from totalRow (sum or "Total" for first column). */
  getTotalCellContent(col: Record<string, unknown>): string {
    const row = this.totalRow();
    if (!row) return '';
    const key = this.getDisplayKey(col as { id: string; columnName?: string; activityDataProperty?: string });
    const val = row[key];
    return val != null ? String(val) : '';
  }

  /** True when Total row should be shown (we have real data and at least one column has amounts to sum). */
  readonly showTotalRow = computed(() => {
    const row = this.totalRow();
    if (!row) return false;
    const cols = this.columns();
    return cols.some((col, i) => {
      if (i === 0) return false;
      const val = row[this.getDisplayKey(col)];
      return typeof val === 'number' || (val !== '—' && val != null && val !== '');
    });
  });

  /** Table-level footer text (below Total row). */
  readonly gridFooterText = computed(() => (this.widget()?.type === WIDGET_TYPE_GRID ? (this.widget()?.gridFooterText ?? '').trim() : ''));

  /** Table-level footer alignment. */
  readonly gridFooterAlignment = computed(() => {
    const a = this.widget()?.gridFooterAlignment;
    return (a === TextAlignment.Left || a === TextAlignment.Center || a === TextAlignment.Right) ? a : TextAlignment.Left;
  });

  /** Caption (table header) alignment. */
  readonly gridHeaderAlignment = computed(() => {
    const a = this.widget()?.gridHeaderAlignment;
    return (a === TextAlignment.Left || a === TextAlignment.Center || a === TextAlignment.Right) ? a : TextAlignment.Left;
  });

  private readonly matSort = viewChild(MatSort);

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
    this.dataSource.sortingDataAccessor = (row: Record<string, unknown>, sortId: string) => {
      const val = row[sortId];
      if (val == null) return '';
      if (typeof val === 'number') return val;
      return String(val);
    };
  }

  ngAfterViewInit(): void {
    effect(() => {
      const sort = this.matSort();
      if (sort) this.dataSource.sort = sort;
    });
  }

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
