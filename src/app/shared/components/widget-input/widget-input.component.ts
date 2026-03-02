import { Component, input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';
import { parseBindingProperty } from '../../utils/binding.util';

@Component({
  selector: 'app-widget-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-input.component.html',
  styleUrl: './widget-input.component.scss',
})
export class WidgetInputComponent {
  widget = input.required<WidgetInstance>();

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
}
