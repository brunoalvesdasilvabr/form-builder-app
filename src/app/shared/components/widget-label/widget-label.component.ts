import { Component, input, output, inject, HostBinding, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';

@Component({
  selector: 'app-widget-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-label.component.html',
  styleUrl: './widget-label.component.scss',
})
export class WidgetLabelComponent {
  protected readonly bindingContext = inject(BindingContextService);

  widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  private readonly editableRef = viewChild<ElementRef<HTMLLabelElement>>('editableRef');

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  getElementClassObj(key: string): Record<string, boolean> {
    return getElementClassObj(this.widget(), key);
  }

  constructor() {
    effect(() => {
      const w = this.widget();
      const el = this.editableRef()?.nativeElement;
      if (!el || document.activeElement === el) return;
      if (w?.valueBinding) {
        el.textContent = this.bindingContext.getValue(w.valueBinding, w.id);
      } else {
        el.textContent = w?.label ?? '';
      }
    });
  }

  onLabelBlur(e: FocusEvent): void {
    const el = e.target as HTMLLabelElement;
    const value = el?.textContent?.trim() ?? '';
    const w = this.widget();
    if (w?.valueBinding) {
      this.bindingContext.setValue(w.valueBinding, value, w.id);
    } else {
      this.labelChange.emit(value);
    }
  }
}
