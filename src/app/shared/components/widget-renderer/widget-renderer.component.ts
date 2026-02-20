import { Component, input, output, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetInputComponent } from '../widget-input/widget-input.component';
import { WidgetCheckboxComponent } from '../widget-checkbox/widget-checkbox.component';
import { WidgetRadioComponent } from '../widget-radio/widget-radio.component';
import { WidgetTableComponent } from '../widget-table/widget-table.component';
import { WidgetLabelComponent } from '../widget-label/widget-label.component';
import type { WidgetInstance, NestedTableState } from '../../models/canvas.model';

const MOVE_DATA_TYPE = 'application/x-canvas-move';

@Component({
  selector: 'app-widget-renderer',
  standalone: true,
  imports: [
    CommonModule,
    WidgetInputComponent,
    WidgetCheckboxComponent,
    WidgetRadioComponent,
    WidgetTableComponent,
    WidgetLabelComponent,
  ],
  templateUrl: './widget-renderer.component.html',
  styleUrl: './widget-renderer.component.scss',
})
export class WidgetRendererComponent {
  widget = input.required<WidgetInstance>();
  cellId = input<string | undefined>(undefined);
  showRemove = input<boolean>(true);
  removeWidget = output<void>();
  nestedTableChange = output<NestedTableState>();
  labelChange = output<string>();
  optionsChange = output<string[]>();
  optionSelect = output<number>();

  private isDragging = false;

  @HostBinding('class') get hostClass(): string {
    const parts: string[] = ['widget'];
    if (this.widget()?.type === 'table') parts.push('widget--no-padding');
    if (this.isDragging) parts.push('widget-dragging');
    const custom = this.widget()?.className?.trim();
    if (custom) parts.push(custom);
    return parts.join(' ');
  }
  @HostBinding('attr.draggable') get draggable(): string | null {
    return this.cellId() ? 'true' : null;
  }

  @HostListener('dragstart', ['$event']) onDragStart(e: DragEvent): void {
    const id = this.cellId();
    if (!id || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(MOVE_DATA_TYPE, JSON.stringify({
      fromCellId: id,
      widget: this.widget(),
    }));
    this.isDragging = true;
  }

  @HostListener('dragend') onDragEnd(): void {
    this.isDragging = false;
  }

  onRemove(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    this.removeWidget.emit();
  }
}
