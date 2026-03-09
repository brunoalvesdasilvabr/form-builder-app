import { Component, input, HostBinding, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import type { WidgetInstance } from '../../models/canvas.model';
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

  /** Columns to display: from widget.gridColumns or one default column. */
  readonly columns = computed(() => {
    const w = this.widget();
    const list = w?.type === 'grid' && w.gridColumns?.length ? w.gridColumns : DEFAULT_COLUMNS;
    return list;
  });

  /** Column ids for matColumnDef and displayedColumns. */
  readonly displayedColumns = computed(() => this.columns().map((c) => c.columnName));

  /** Key used to read cell value from row; uses activityDataProperty when column is bound to activities. */
  getDisplayKey(col: { columnName: string; activityDataProperty?: string }): string {
    return col.activityDataProperty ?? col.columnName;
  }

  /** CSS class(es) for column cells. */
  getColumnClass(col: Record<string, unknown>): string {
    return (col['className'] as string) ?? '';
  }

  /** Text alignment for column cells. */
  getColumnAlignment(col: Record<string, unknown>): string {
    const a = col['alignment'];
    return (a === 'left' || a === 'center' || a === 'right') ? a : 'left';
  }

  /** Data source: uses widget.gridDataSourcePreview when defined, otherwise placeholder. */
  readonly dataSource = new MatTableDataSource<Record<string, unknown>>(PLACEHOLDER_ROW);

  constructor() {
    super();
    effect(() => {
      const w = this.widget();
      const data = w?.type === 'grid' && w.gridDataSourcePreview?.length
        ? w.gridDataSourcePreview
        : PLACEHOLDER_ROW;
      this.dataSource.data = data;
    });
  }

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
