import { Component, input, output, HostBinding } from '@angular/core';
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

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  getElementClassObj(key: string): Record<string, boolean> {
    const ec = this.widget()?.elementClasses;
    const val = ec?.[key];
    return val ? { [val]: true } : {};
  }
}
