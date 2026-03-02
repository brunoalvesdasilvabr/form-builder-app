import { Component, input, output, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { BaseWidgetComponent } from '../base-widget.component';

@Component({
  selector: 'app-widget-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-checkbox.component.html',
  styleUrl: './widget-checkbox.component.scss',
})
export class WidgetCheckboxComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  onLabelInput(value: string): void {
    this.labelChange.emit(value);
  }
}
