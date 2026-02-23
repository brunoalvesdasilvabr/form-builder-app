import type { WidgetInstance } from '../models/canvas.model';

/** Returns ngClass object for element classes bound via elementClasses[key]. */
export function getElementClassObj(widget: WidgetInstance | undefined, key: string): Record<string, boolean> {
  const val = widget?.elementClasses?.[key];
  return val ? { [val]: true } : {};
}
