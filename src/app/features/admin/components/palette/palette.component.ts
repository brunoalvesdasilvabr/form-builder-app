import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import type { WidgetType } from '../../../../shared/models/canvas.model';
import {
  WIDGET_LABELS,
  WIDGET_PALETTE_ICONS,
  WIDGET_TYPE_INPUT,
  WIDGET_TYPE_LABEL,
  WIDGET_TYPE_PANEL,
  WIDGET_TYPE_TABLE,
} from '../../../../shared/models/canvas.model';
import type { LayoutActionType } from '../../../../shared/enums';
import { GridAction, LayoutAction } from '../../../../shared/enums';
import { DragDropDataKey } from '../../../../shared/constants/drag-drop.constants';

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
  readonly layoutWidgets: WidgetType[] = [WIDGET_TYPE_TABLE];

  /** Layout actions: row, col (drag to add row/column) */
  readonly layoutActions = [LayoutAction.Row, LayoutAction.Col] as const;
  readonly layoutActionLabels: Record<string, string> = { [LayoutAction.Row]: 'Row', [LayoutAction.Col]: 'Col' };
  readonly layoutActionIcons: Record<string, string> = { [LayoutAction.Row]: '↕', [LayoutAction.Col]: '↔' };

  /** Data section: label, input, panel (grid is under its own submenu) */
  readonly dataWidgets: WidgetType[] = [WIDGET_TYPE_LABEL, WIDGET_TYPE_INPUT, WIDGET_TYPE_PANEL];

  /** Exposed for template: panel is not draggable. */
  readonly widgetTypePanel = WIDGET_TYPE_PANEL;

  /** Grid submenu: add col only (rows cannot be added to grids) */
  readonly gridActions = [GridAction.Col] as const;
  readonly gridActionLabels: Record<string, string> = { [GridAction.Row]: 'Add Row', [GridAction.Col]: 'Add Col' };
  readonly gridActionIcons: Record<string, string> = { [GridAction.Row]: '↕', [GridAction.Col]: '↔' };

  iconFor(type: WidgetType): string {
    return WIDGET_PALETTE_ICONS[type] ?? '?';
  }

  onWidgetDragStart(e: DragEvent, type: WidgetType): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DragDropDataKey.WidgetType, type);
    e.dataTransfer.setData('text/plain', type);
    if (e.target instanceof HTMLElement) {
      e.target.classList.add('palette-item-dragging');
    }
  }

  onLayoutActionDragStart(e: DragEvent, action: LayoutActionType): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DragDropDataKey.LayoutAction, action);
    e.dataTransfer.setData(action === LayoutAction.Row ? DragDropDataKey.LayoutActionRow : DragDropDataKey.LayoutActionCol, '');
    e.dataTransfer.setData('text/plain', action);
    if (e.target instanceof HTMLElement) {
      e.target.classList.add('palette-item-dragging');
    }
  }

  onGridActionDragStart(e: DragEvent, action: string): void {
    if (!e.dataTransfer) return;
    const raw = action === GridAction.Row ? LayoutAction.Row : LayoutAction.Col;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DragDropDataKey.GridAction, raw);
    e.dataTransfer.setData(raw === LayoutAction.Row ? DragDropDataKey.GridActionRow : DragDropDataKey.GridActionCol, '');
    e.dataTransfer.setData('text/plain', raw);
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
