import { Component, input, output, signal, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WidgetInstance } from '../../models/canvas.model';
import { getElementClassObj } from '../../utils/element-class.util';
import { parseBindingProperty } from '../../utils/binding.util';

@Component({
  selector: 'app-widget-radio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-radio.component.html',
  styleUrl: './widget-radio.component.scss',
})
export class WidgetRadioComponent {
  /** Per-widget selected value (widgetId -> selected option value) for local UX only. */
  private readonly selectedByWidget = signal<Record<string, string>>({});

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

  getPropertyBinding(binding: string | undefined): string | null {
    const prop = parseBindingProperty(binding);
    return prop || null;
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

  /** Selected value for this radio group (local UX only). */
  getSelectedValue(w: WidgetInstance): string {
    return this.selectedByWidget()[w.id] ?? '';
  }

  onRadioSelect(w: WidgetInstance, value: string): void {
    this.selectedByWidget.update((prev) => ({ ...prev, [w.id]: value }));
  }
}
