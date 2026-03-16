import { DragDropDataKey } from '../constants/drag-drop.constants';
import type { WidgetType } from '../models/canvas.model';
import { WIDGET_TYPES } from '../models/canvas.model';

/**
 * Reads the dragged widget type from a drag event (palette or text/plain fallback).
 * Returns the type only if it is a valid WidgetType; otherwise null.
 */
export function getWidgetTypeFromDragEvent(e: DragEvent): WidgetType | null {
  const raw = (
    e.dataTransfer?.getData(DragDropDataKey.WidgetType) ||
    e.dataTransfer?.getData('text/plain') ||
    ''
  ).trim();
  const type = raw.toLowerCase() as WidgetType;
  if (!type || !WIDGET_TYPES.includes(type)) return null;
  return type;
}
