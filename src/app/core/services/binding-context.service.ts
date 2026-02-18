import { Injectable, signal, inject } from '@angular/core';
import { CanvasService } from './canvas.service';

/** Holds the current values for each bindable property from the dropdown (array of objects). Components use the selected property's value as the ngModel variable. */
@Injectable({ providedIn: 'root' })
export class BindingContextService {
  private readonly canvas = inject(CanvasService);

  /** Current value for each binding key; keys come from bindableProperties[].value. */
  readonly bindingValues = signal<Record<string, string>>(this.getInitialValues());

  private getInitialValues(): Record<string, string> {
    return Object.fromEntries(
      this.canvas.bindableProperties.map((p) => [p.value, ''])
    );
  }

  /** Parse "{{ listValue1 }}" to "listValue1", or return null if not a binding string. */
  parseBindingKey(binding: string | undefined): string | null {
    if (!binding) return null;
    const m = binding.match(/^\{\{\s*(\S+)\s*\}\}$/);
    return m ? m[1] : null;
  }

  /** Get the current value for the given binding (e.g. "{{ listValue1 }}" -> value of listValue1). */
  getValue(binding: string | undefined): string {
    const key = this.parseBindingKey(binding);
    if (!key) return '';
    return this.bindingValues()[key] ?? '';
  }

  /** Set the value for the given binding variable. */
  setValue(binding: string | undefined, value: string): void {
    const key = this.parseBindingKey(binding);
    if (!key) return;
    this.bindingValues.update((prev) => ({ ...prev, [key]: value }));
  }
}
