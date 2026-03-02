import type { InputSignal } from '@angular/core';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj as getElementClassObjUtil } from '../../utils/element-class.util';
import { parseBindingProperty } from '../../utils/binding.util';

/** Base class for widget components sharing getElementClassObj and getPropertyBinding. */
export abstract class BaseWidgetComponent {
  abstract readonly widget: InputSignal<WidgetInstance>;

  getElementClassObj(key: string): Record<string, boolean> {
    return getElementClassObjUtil(this.widget(), key);
  }

  getPropertyBinding(binding: string | undefined): string | null {
    const prop = parseBindingProperty(binding);
    return prop || null;
  }
}
