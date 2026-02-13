import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmbeddedTableComponent } from '../embedded-table/embedded-table.component';
import type { WidgetInstance, NestedTableState } from '../../models/canvas.model';

const MOVE_DATA_TYPE = 'application/x-canvas-move';

/** Presentational component: renders a widget with inputs/outputs only. */
@Component({
  selector: 'app-widget-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule, EmbeddedTableComponent],
  templateUrl: './widget-renderer.component.html',
  styleUrl: './widget-renderer.component.scss',
})
export class WidgetRendererComponent {
  widget = input.required<WidgetInstance>();
  /** When set, the widget can be dragged to another cell (main canvas). */
  cellId = input<string | undefined>(undefined);
  showRemove = input<boolean>(true);
  removeWidget = output<void>();
  nestedTableChange = output<NestedTableState>();
  labelChange = output<string>();
  optionsChange = output<string[]>();

  onDragStartCell(e: DragEvent): void {
    const id = this.cellId();
    if (!id || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(MOVE_DATA_TYPE, JSON.stringify({
      fromCellId: id,
      widget: this.widget(),
    }));
    (e.target as HTMLElement)?.classList.add('widget-dragging');
  }

  onDragEndCell(e: DragEvent): void {
    (e.target as HTMLElement)?.classList.remove('widget-dragging');
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
