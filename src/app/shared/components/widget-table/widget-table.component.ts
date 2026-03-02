import { Component, input, output, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmbeddedTableComponent } from '../embedded-table/embedded-table.component';
import type { WidgetInstance, NestedTableState } from '../../models/canvas.model';
import { BaseWidgetComponent } from '../base-widget.component';

@Component({
  selector: 'app-widget-table',
  standalone: true,
  imports: [CommonModule, EmbeddedTableComponent],
  templateUrl: './widget-table.component.html',
  styleUrl: './widget-table.component.scss',
})
export class WidgetTableComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();
  parentCellId = input<string | undefined>(undefined);
  nestedTableChange = output<NestedTableState>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
