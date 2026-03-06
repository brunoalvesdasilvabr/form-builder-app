import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import type { WidgetType } from '../../../../shared/models/canvas.model';
import {
  WIDGET_LABELS,
  WIDGET_PALETTE_ICONS,
} from '../../../../shared/models/canvas.model';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule, MatExpansionModule],
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  readonly labels = signal(WIDGET_LABELS);

  /** Layout section: table, grid */
  readonly layoutWidgets: WidgetType[] = ['table', 'grid'];

  /** Data section: label, input, checkbox, radio */
  readonly dataWidgets: WidgetType[] = ['label', 'input', 'checkbox', 'radio'];

  iconFor(type: WidgetType): string {
    return WIDGET_PALETTE_ICONS[type] ?? '?';
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
