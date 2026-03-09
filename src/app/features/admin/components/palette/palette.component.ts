import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import type { WidgetType } from '../../../../shared/models/canvas.model';
import { WIDGET_LABELS, WIDGET_PALETTE_ICONS } from '../../../../shared/models/canvas.model';
import { LayoutAction } from '../../../../shared/enums';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule, MatExpansionModule],
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  readonly labels = signal(WIDGET_LABELS);

  /** Layout section: table */
  readonly layoutWidgets: WidgetType[] = ['table'];

  /** Layout actions: row, col (drag to add row/column) */
  readonly layoutActions = [LayoutAction.Row, LayoutAction.Col] as const;
  readonly layoutActionLabels: Record<string, string> = { [LayoutAction.Row]: 'Row', [LayoutAction.Col]: 'Col' };
  readonly layoutActionIcons: Record<string, string> = { [LayoutAction.Row]: '↕', [LayoutAction.Col]: '↔' };

  /** Data section: label, input, grid, panel */
  readonly dataWidgets: WidgetType[] = ['label', 'input', 'grid', 'panel'];

  iconFor(type: WidgetType): string {
    return WIDGET_PALETTE_ICONS[type] ?? '?';
  }

  onWidgetDragStart(e: DragEvent, type: WidgetType): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/widget-type', type);
    e.dataTransfer.setData('text/plain', type);
    if (e.target instanceof HTMLElement) {
      e.target.classList.add('palette-item-dragging');
    }
  }

  onLayoutActionDragStart(e: DragEvent, action: 'row' | 'col'): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/layout-action', action);
    e.dataTransfer.setData(`application/layout-action-${action}`, '');
    e.dataTransfer.setData('text/plain', action);
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
