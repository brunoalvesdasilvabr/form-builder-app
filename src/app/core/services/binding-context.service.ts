import { Injectable, signal, inject } from '@angular/core';
import { CanvasService } from './canvas.service';
import { parseBindingProperty } from '../../shared/utils/binding.util';

/**
 * Holds values for bindable properties. In the builder, each widget instance has its own
 * value for the same binding key (e.g. two labels bound to listValue3 can show different text).
 * Export still uses {{ listValue3 }}; independence is only for builder preview.
 */
@Injectable({ providedIn: 'root' })
export class BindingContextService {
  private readonly canvas = inject(CanvasService);

  /** Global value per binding key (fallback / runtime). */
  readonly bindingValues = signal<Record<string, string>>(this.getInitialValues());
  /** Per-widget-instance values in builder: key = `${propKey}_${widgetId}`. */
  private readonly instanceValues = signal<Record<string, string>>({});

  private getInitialValues(): Record<string, string> {
    return Object.fromEntries(
      this.canvas.bindableProperties.map((p) => [p.value, ''])
    );
  }

  /** Parse "{{ listValue1 }}" to "listValue1", or return null if not a binding string. */
  parseBindingKey(binding: string | undefined): string | null {
    const key = parseBindingProperty(binding);
    return key || null;
  }

  private instanceKey(propKey: string, widgetId: string): string {
    return `${propKey}__${widgetId}`;
  }

  /** Get value for the binding. Pass widgetId for per-instance value in builder. */
  getValue(binding: string | undefined, widgetId?: string): string {
    const key = this.parseBindingKey(binding);
    if (!key) return '';
    if (widgetId) {
      const inst = this.instanceValues()[this.instanceKey(key, widgetId)];
      if (inst !== undefined) return inst;
    }
    return this.bindingValues()[key] ?? '';
  }

  /** Set value for the binding. Pass widgetId for per-instance value in builder. */
  setValue(binding: string | undefined, value: string, widgetId?: string): void {
    const key = this.parseBindingKey(binding);
    if (!key) return;
    if (widgetId) {
      this.instanceValues.update((prev) => ({
        ...prev,
        [this.instanceKey(key, widgetId)]: value,
      }));
      return;
    }
    this.bindingValues.update((prev) => ({ ...prev, [key]: value }));
  }
}
