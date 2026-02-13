import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetType } from '../../../../shared/models/canvas.model';
import { WIDGET_LABELS } from '../../../../shared/models/canvas.model';

const WIDGET_TYPES: WidgetType[] = ['input', 'checkbox', 'radio', 'table', 'label'];

/** Presentational: drag source for widget types. */
@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  readonly widgets = signal<WidgetType[]>(WIDGET_TYPES);
  readonly labels = signal(WIDGET_LABELS);

  iconFor(type: WidgetType): string {
    const icons: Record<WidgetType, string> = {
      input: '▭',
      checkbox: '☑',
      radio: '◉',
      table: '⊞',
      label: 'Aa',
    };
    return icons[type] ?? '?';
  }

  onDragStart(e: DragEvent, type: WidgetType): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/widget-type', type);
    e.dataTransfer.setData('text/plain', type);
    if (e.target instanceof HTMLElement) {
      e.target.classList.add('palette-item-dragging');
    }
  }

  onDragEnd(e: DragEvent): void {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('palette-item-dragging');
    }
  }
}
