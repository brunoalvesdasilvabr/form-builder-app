import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';

@Component({
  selector: 'app-widget-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-input.component.html',
  styleUrl: './widget-input.component.scss',
})
export class WidgetInputComponent {
  protected readonly bindingContext = inject(BindingContextService);

  widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }
}
