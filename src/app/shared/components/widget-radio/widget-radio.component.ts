import { Component, input, output, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BindingContextService } from '../../../core/services/binding-context.service';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';

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
    return getElementClassObj(this.widget(), key);
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

  /** Single selected value for the group (ensures mutual exclusivity). */
  getSelectedValue(w: WidgetInstance): string {
    if (w.valueBinding) return this.bindingContext.getValue(w.valueBinding);
    const ob = w.optionBindings;
    const opts = w.options ?? ['Option 1', 'Option 2'];
    if (ob?.length) {
      for (let i = 0; i < opts.length; i++) {
        const v = this.bindingContext.getValue(ob[i]);
        if (v === opts[i]) return opts[i];
      }
    }
    return '';
  }

  onRadioSelect(w: WidgetInstance, value: string): void {
    if (w.valueBinding) {
      this.bindingContext.setValue(w.valueBinding, value);
      return;
    }
    const ob = w.optionBindings;
    const opts = w.options ?? ['Option 1', 'Option 2'];
    if (ob?.length) {
      opts.forEach((opt, i) => this.bindingContext.setValue(ob[i], opt === value ? value : ''));
    }
  }
}
