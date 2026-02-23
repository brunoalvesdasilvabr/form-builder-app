import { Component, input, output, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetInputComponent } from '../widget-input/widget-input.component';
import { WidgetCheckboxComponent } from '../widget-checkbox/widget-checkbox.component';
import { WidgetRadioComponent } from '../widget-radio/widget-radio.component';
import { WidgetLabelComponent } from '../widget-label/widget-label.component';
import type { WidgetInstance } from '../../models/canvas.model';

const NESTED_MOVE_DATA_TYPE = 'application/x-nested-move';

@Component({
  selector: 'app-widget-cell-renderer',
  standalone: true,
  imports: [
    CommonModule,
    WidgetInputComponent,
    WidgetCheckboxComponent,
    WidgetRadioComponent,
    WidgetLabelComponent,
  ],
  templateUrl: './widget-cell-renderer.component.html',
  styleUrl: './widget-cell-renderer.component.scss',
})
export class WidgetCellRendererComponent {
  widget = input.required<WidgetInstance>();
  cellId = input<string | undefined>(undefined);
  removeWidget = output<void>();
  labelChange = output<string>();
  optionsChange = output<string[]>();
  optionSelect = output<number>();

  @HostBinding('class.widget-cell') readonly hasWidgetCellClass = true;
  @HostBinding('attr.draggable') get draggable(): string | null {
    return this.cellId() ? 'true' : null;
  }
  @HostBinding('class.widget-cell-dragging') isDragging = false;

  @HostListener('dragstart', ['$event']) onDragStart(e: DragEvent): void {
    const id = this.cellId();
    if (!id || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(NESTED_MOVE_DATA_TYPE, JSON.stringify({
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
