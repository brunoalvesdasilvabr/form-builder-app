import { Component, input, output, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';
import { parseBindingProperty } from '../../utils/binding.util';

@Component({
  selector: 'app-widget-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-checkbox.component.html',
  styleUrl: './widget-checkbox.component.scss',
})
export class WidgetCheckboxComponent {
  widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  getElementClassObj(key: string): Record<string, boolean> {
    return getElementClassObj(this.widget(), key);
  }

  getPropertyBinding(binding: string | undefined): string | null {
    const prop = parseBindingProperty(binding);
    return prop || null;
  }

  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }
}
