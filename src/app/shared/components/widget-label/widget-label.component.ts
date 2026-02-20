import { Component, input, output, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';

@Component({
  selector: 'app-widget-label',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-label.component.html',
  styleUrl: './widget-label.component.scss',
})
export class WidgetLabelComponent {
  protected readonly bindingContext = inject(BindingContextService);

  widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  getElementClassObj(key: string): Record<string, boolean> {
    const ec = this.widget()?.elementClasses;
    const val = ec?.[key];
    return val ? { [val]: true } : {};
  }

  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }
}
