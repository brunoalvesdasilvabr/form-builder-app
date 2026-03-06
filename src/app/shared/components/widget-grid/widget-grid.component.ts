import { Component, input, HostBinding, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import type { WidgetInstance } from '../../models/canvas.model';
import { BaseWidgetComponent } from '../base-widget.component';

const DEFAULT_COLUMNS = [{ id: 'col0', columnName: 'column1', headerName: 'Column 1' }];
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

  /** Placeholder data so at least one row is visible; real data binding will come later. */
  readonly dataSource = new MatTableDataSource<Record<string, unknown>>(PLACEHOLDER_ROW);

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
