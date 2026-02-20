import { Component, input, output, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';

@Component({
  selector: 'app-widget-radio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-radio.component.html',
  styleUrl: './widget-radio.component.scss',
})
export class WidgetRadioComponent {
  protected readonly bindingContext = inject(BindingContextService);

  widget = input.required<WidgetInstance>();
  labelChange = output<string>();
  optionsChange = output<string[]>();
  optionSelect = output<number>();

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

  onOptionChange(options: string[], index: number, value: string): void {
    const next = [...(options ?? [])];
    next[index] = value;
    this.optionsChange.emit(next);
  }

  addOption(options: string[]): void {
    const list = options ?? [];
    this.optionsChange.emit([...list, `Option ${list.length + 1}`]);
  }

  removeOption(options: string[], index: number): void {
    const next = (options ?? []).filter((_, i) => i !== index);
    this.optionsChange.emit(next.length ? next : ['Option 1']);
  }

  onRadioOptionClick(optionIndex: number): void {
    this.optionSelect.emit(optionIndex);
  }
}
