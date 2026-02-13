import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { WidgetInstance } from '../../models/canvas.model';

const NESTED_MOVE_DATA_TYPE = 'application/x-nested-move';

/** Presentational component: renders a widget inside an embedded table cell (inputs/outputs only). */
@Component({
  selector: 'app-widget-cell-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-cell-renderer.component.html',
  styleUrl: './widget-cell-renderer.component.scss',
})
export class WidgetCellRendererComponent {
  widget = input.required<WidgetInstance>();
  /** When set, the widget can be dragged to another cell within the embedded table. */
  cellId = input<string | undefined>(undefined);
  removeWidget = output<void>();
  labelChange = output<string>();
  optionsChange = output<string[]>();

  onDragStartNested(e: DragEvent): void {
    const id = this.cellId();
    if (!id || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(NESTED_MOVE_DATA_TYPE, JSON.stringify({
      fromCellId: id,
      widget: this.widget(),
    }));
    (e.target as HTMLElement)?.classList.add('widget-cell-dragging');
  }

  onDragEndNested(e: DragEvent): void {
    (e.target as HTMLElement)?.classList.remove('widget-cell-dragging');
  }

  onRemove(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    this.removeWidget.emit();
  }

  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }

  onOptionChange(options: string[], index: number, value: string): void {
    const next = [...(options ?? [])];
    next[index] = value;
    this.optionsChange.emit(next);
  }

  addOption(options: string[]): void {
    const list = options ?? [];
    this.optionsChange.emit([...list, `Option ${list.length + 1}`]);
  }

  removeOption(options: string[], index: number): void {
    const next = (options ?? []).filter((_, i) => i !== index);
    this.optionsChange.emit(next.length ? next : ['Option 1']);
  }
}
