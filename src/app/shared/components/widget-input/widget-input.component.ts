import { Component, input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { BaseWidgetComponent } from '../base-widget.component';

@Component({
  selector: 'app-widget-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-input.component.html',
  styleUrl: './widget-input.component.scss',
})
export class WidgetInputComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }
}
