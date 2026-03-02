import { Component, input, output, HostBinding, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { BaseWidgetComponent } from '../base-widget.component';

@Component({
  selector: 'app-widget-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-label.component.html',
  styleUrl: './widget-label.component.scss',
})
export class WidgetLabelComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();
  labelChange = output<string>();

  private readonly editableRef = viewChild<ElementRef<HTMLLabelElement>>('editableRef');

  @HostBinding('class') get hostClass(): string {
    return this.widget()?.innerClassName?.trim() ?? '';
  }

  constructor() {
    effect(() => {
      const w = this.widget();
      const el = this.editableRef()?.nativeElement;
      if (!el || document.activeElement === el) return;
      el.textContent = w?.label ?? '';
    });
  }

  onLabelBlur(e: FocusEvent): void {
    const el = e.target as HTMLLabelElement;
    const value = el?.textContent?.trim() ?? '';
    this.labelChange.emit(value);
  }
}
