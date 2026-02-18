import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmbeddedTableComponent } from '../embedded-table/embedded-table.component';
import type { WidgetInstance, NestedTableState } from '../../models/canvas.model';

@Component({
  selector: 'app-widget-table',
  standalone: true,
  imports: [CommonModule, EmbeddedTableComponent],
  templateUrl: './widget-table.component.html',
  styleUrl: './widget-table.component.scss',
})
export class WidgetTableComponent {
  widget = input.required<WidgetInstance>();
  nestedTableChange = output<NestedTableState>();
}
