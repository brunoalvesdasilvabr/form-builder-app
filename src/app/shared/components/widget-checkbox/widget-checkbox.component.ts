import { Component, input, output, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';

@Component({
  selector: 'app-widget-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-checkbox.component.html',
  styleUrl: './widget-checkbox.component.scss',
})
export class WidgetCheckboxComponent {
  protected readonly bindingContext = inject(BindingContextService);

  widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  getElementClassObj(key: string): Record<string, boolean> {
    return getElementClassObj(this.widget(), key);
  }


  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }
}
