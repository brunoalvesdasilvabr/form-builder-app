import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaletteComponent } from './components/palette/palette.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { CanvasService } from '../../core/services/canvas.service';
import type { CanvasCell } from '../../shared/models/canvas.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaletteComponent, CanvasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly canvas = inject(CanvasService);

  readonly selectedCell = this.canvas.selectedCell;
  readonly bindableProperties = this.canvas.bindableProperties;
  readonly selectedOptionIndex = this.canvas.selectedOptionIndex;

  /** Pending values in the form (not applied until Apply is clicked). */
  readonly pendingClass = signal('');
  readonly pendingProperty = signal('');
  /** Snapshot when panel opened / last apply (to detect what changed). */
  private initialClass = '';
  private initialProperty = '';

  /** Notifications to show after Apply (e.g. "Your class was bound to the component"). */
  readonly notificationMessages = signal<string[]>([]);

  constructor() {
    effect(() => {
      const cell = this.selectedCell();
      if (cell) {
        this.initialClass = cell.className ?? '';
        this.initialProperty = this.getCurrentBindingProperty(cell);
        this.pendingClass.set(this.initialClass);
        this.pendingProperty.set(this.initialProperty);
      }
    });
  }

  closePanel(): void {
    this.canvas.setSelectedCell(null);
  }

  /** Apply pending class and property, then show notification for what changed. */
  applyChanges(): void {
    const cell = this.selectedCell();
    if (!cell) return;

    const messages: string[] = [];
    const classChanged = this.pendingClass() !== this.initialClass;
    const propertyChanged = this.pendingProperty() !== this.initialProperty;

    if (classChanged) {
      this.canvas.updateCellClass(cell.id, this.pendingClass());
      messages.push('Your class was bound to the component.');
      this.initialClass = this.pendingClass();
    }
    if (propertyChanged) {
      this.applyPropertyBinding(cell, this.pendingProperty());
      messages.push('Your property was bound to the component.');
      this.initialProperty = this.pendingProperty();
    }

    if (messages.length) {
      this.notificationMessages.set(messages);
      setTimeout(() => this.notificationMessages.set([]), 4000);
    }
  }

  private applyPropertyBinding(cell: CanvasCell, propertyValue: string): void {
    const w = cell.widget;
    if (!w) return;
    if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
      this.canvas.updateOptionBinding(cell.id, w.id, this.selectedOptionIndex()!, propertyValue);
    } else {
      this.canvas.updateValueBinding(cell.id, w.id, propertyValue);
    }
  }

  /** Human-readable label for what the property binding applies to. */
  getBindingTargetLabel(cell: CanvasCell): string {
    const w = cell.widget;
    if (!w) return '';
    const typeLabels: Record<string, string> = {
      input: 'Input',
      checkbox: 'Checkbox',
      label: 'Label',
      radio: 'Radio',
      table: 'Table',
    };
    const base = typeLabels[w.type] ?? w.type;
    if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
      const idx = this.selectedOptionIndex()!;
      const opt = (w.options ?? [])[idx];
      const optionLabel = opt ? `"${opt}"` : `Option ${idx + 1}`;
      return `${base} → ${optionLabel}`;
    }
    return base;
  }

  /** Hint text showing what is bound and the value= template (e.g. "Bound to: Input — value={{ listValue1 }}"). */
  getBindingHint(cell: CanvasCell): string {
    const label = this.getBindingTargetLabel(cell);
    const prop = this.getCurrentBindingProperty(cell);
    if (!prop) return `Bound to: ${label}`;
    return `Bound to: ${label} — value={{ ${prop} }}`;
  }

  /** Get the current binding as a property name (e.g. "listValue1") for the dropdown. */
  getCurrentBindingProperty(cell: CanvasCell): string {
    const w = cell.widget;
    if (!w) return '';
    if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
      const binding = w.optionBindings?.[this.selectedOptionIndex()!];
      return this.parseBindingProperty(binding);
    }
    return this.parseBindingProperty(w.valueBinding);
  }

  private parseBindingProperty(binding: string | undefined): string {
    if (!binding) return '';
    const m = binding.match(/^\{\{\s*(\S+)\s*\}\}$/);
    return m ? m[1] : '';
  }
}
