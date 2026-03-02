import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaletteComponent } from './components/palette/palette.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { CanvasService } from '../../core/services/canvas.service';
import { SavedLayoutsService } from '../../core/services/saved-layouts.service';
import type { CanvasCell } from '../../shared/models/canvas.model';
import { parseBindingProperty } from '../../shared/utils/binding.util';
import {
  ERROR_CONDITION_SNIPPETS,
  type ErrorConditionSnippet,
} from '../../shared/constants/error-condition.constants';
import { slugify } from '../../shared/utils/slugify.util';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaletteComponent, CanvasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly canvas = inject(CanvasService);
  private readonly savedLayouts = inject(SavedLayoutsService);

  readonly selectedCell = this.canvas.selectedCell;
  readonly selectedNestedPath = this.canvas.selectedNestedPath;
  readonly selectedTarget = this.canvas.selectedTarget;
  readonly selectedElementKey = this.canvas.selectedElementKey;
  readonly bindableProperties = this.canvas.bindableProperties;
  readonly selectedOptionIndex = this.canvas.selectedOptionIndex;

  /** Pending values in the form (not applied until Apply is clicked). */
  readonly pendingClass = signal('');
  readonly pendingProperty = signal('');
  readonly pendingFormControlName = signal('');
  readonly pendingErrorMessage = signal('');
  readonly pendingErrorCondition = signal('');
  readonly pendingMinLength = signal('');
  readonly pendingMaxLength = signal('');
  readonly pendingMin = signal('');
  readonly pendingMax = signal('');
  readonly pendingPattern = signal('');
  /** Selected index for "Insert rule" dropdown (reset after insert so user can continue typing). */
  readonly insertSnippetChoice = signal<string>('');
  /** Snapshot when panel opened / last apply (to detect what changed). */
  private initialClass = '';
  private initialProperty = '';
  private initialFormControlName = '';
  private initialErrorMessage = '';
  private initialErrorCondition = '';
  private initialMinLength = '';
  private initialMaxLength = '';
  private initialMin = '';
  private initialMax = '';
  private initialPattern = '';

  readonly errorConditionSnippets = ERROR_CONDITION_SNIPPETS;

  /** Form group name from layout (slugified) for snippet placeholders */
  readonly formGroupName = computed(() => {
    const layout = this.savedLayouts.selectedLayout();
    return slugify(layout?.name?.trim() ?? 'form');
  });

  /** Notifications to show after Apply (e.g. "Your class was bound to the component"). */
  readonly notificationMessages = signal<string[]>([]);

  constructor() {
    effect(() => {
      const cell = this.selectedCell();
      const target = this.selectedTarget();
      const elementKey = this.selectedElementKey();
      this.insertSnippetChoice.set('');
      if (cell) {
        if (target === 'element' && elementKey) {
          this.initialClass = cell.widget?.elementClasses?.[elementKey] ?? '';
        } else if (target === 'widget' && cell.widget) {
          this.initialClass = cell.widget.className ?? '';
        } else if (target === 'widget-inner' && cell.widget) {
          this.initialClass = cell.widget.innerClassName ?? '';
        } else {
          this.initialClass = (cell as { className?: string }).className ?? '';
        }
        this.initialProperty = this.getCurrentBindingProperty(cell);
        this.initialFormControlName = (cell.widget && ['input', 'checkbox', 'radio'].includes(cell.widget.type))
          ? (cell.widget.formControlName ?? '')
          : '';
        this.initialErrorMessage = (cell.widget && ['input', 'checkbox', 'radio'].includes(cell.widget.type))
          ? (cell.widget.errorMessage ?? '')
          : '';
        this.initialErrorCondition = (cell.widget && ['input', 'checkbox', 'radio'].includes(cell.widget.type))
          ? (cell.widget.errorCondition ?? '')
          : '';
        const w = cell.widget;
        this.initialMinLength = w?.type === 'input' && w.minLength != null ? String(w.minLength) : '';
        this.initialMaxLength = w?.type === 'input' && w.maxLength != null ? String(w.maxLength) : '';
        this.initialMin = w?.type === 'input' && w.min != null ? String(w.min) : '';
        this.initialMax = w?.type === 'input' && w.max != null ? String(w.max) : '';
        this.initialPattern = w?.type === 'input' && w.pattern != null ? String(w.pattern) : '';
        this.pendingClass.set(this.initialClass);
        this.pendingProperty.set(this.initialProperty);
        this.pendingFormControlName.set(this.initialFormControlName);
        this.pendingErrorMessage.set(this.initialErrorMessage);
        this.pendingErrorCondition.set(this.initialErrorCondition);
        this.pendingMinLength.set(this.initialMinLength);
        this.pendingMaxLength.set(this.initialMaxLength);
        this.pendingMin.set(this.initialMin);
        this.pendingMax.set(this.initialMax);
        this.pendingPattern.set(this.initialPattern);
      }
    });
  }

  closePanel(): void {
    this.insertSnippetChoice.set('');
    this.canvas.setSelectedCell(null);
  }

  /** Apply pending class and property, then show notification for what changed. */
  applyChanges(): void {
    const cell = this.selectedCell();
    if (!cell) return;

    const messages: string[] = [];
    const classChanged = this.pendingClass() !== this.initialClass;
    const propertyChanged = this.pendingProperty() !== this.initialProperty;
    const formControlNameChanged = this.pendingFormControlName() !== this.initialFormControlName;
    const errorMessageChanged = this.pendingErrorMessage() !== this.initialErrorMessage;
    const errorConditionChanged = this.pendingErrorCondition() !== this.initialErrorCondition;
    const minLengthChanged = this.pendingMinLength() !== this.initialMinLength;
    const maxLengthChanged = this.pendingMaxLength() !== this.initialMaxLength;
    const minChanged = this.pendingMin() !== this.initialMin;
    const maxChanged = this.pendingMax() !== this.initialMax;
    const patternChanged = this.pendingPattern() !== this.initialPattern;
    const nested = this.selectedNestedPath();

    if (classChanged) {
      const target = this.selectedTarget();
      const elementKey = this.selectedElementKey();
      if (nested) {
        const { parentCellId, parentWidgetId, nestedCellId } = nested;
        if (target === 'element' && elementKey && cell.widget) {
          this.canvas.updateNestedWidgetElementClass(parentCellId, parentWidgetId, nestedCellId, cell.widget.id, elementKey, this.pendingClass());
        } else if (target === 'widget' && cell.widget) {
          this.canvas.updateNestedWidgetClass(parentCellId, parentWidgetId, nestedCellId, cell.widget.id, this.pendingClass());
        } else if (target === 'widget-inner' && cell.widget) {
          this.canvas.updateNestedWidgetInnerClass(parentCellId, parentWidgetId, nestedCellId, cell.widget.id, this.pendingClass());
        } else {
          this.canvas.updateNestedCellClass(parentCellId, parentWidgetId, nestedCellId, this.pendingClass());
        }
      } else {
        if (target === 'element' && elementKey && cell.widget) {
          this.canvas.updateWidgetElementClass(cell.id, cell.widget.id, elementKey, this.pendingClass());
        } else if (target === 'widget' && cell.widget) {
          this.canvas.updateWidgetClass(cell.id, cell.widget.id, this.pendingClass());
        } else if (target === 'widget-inner' && cell.widget) {
          this.canvas.updateWidgetInnerClass(cell.id, cell.widget.id, this.pendingClass());
        } else {
          this.canvas.updateCellClass(cell.id, this.pendingClass());
        }
      }
      const targetLabel = this.getClassTargetLabel();
      messages.push(`Your class was bound to the ${targetLabel}.`);
      this.initialClass = this.pendingClass();
    }
    if (propertyChanged) {
      this.applyPropertyBinding(cell, this.pendingProperty());
      messages.push('Your property was bound to the component.');
      this.initialProperty = this.pendingProperty();
    }
    if (formControlNameChanged && cell.widget && ['input', 'checkbox', 'radio'].includes(cell.widget.type)) {
      this.applyFormControlName(cell);
      messages.push('Control name (data-form-control-name) was applied.');
      this.initialFormControlName = this.pendingFormControlName();
    }
    if ((errorMessageChanged || errorConditionChanged) && cell.widget && ['input', 'checkbox', 'radio'].includes(cell.widget.type)) {
      this.applyErrorFields(cell);
      messages.push('Error message and visibility rule were applied.');
      this.initialErrorMessage = this.pendingErrorMessage();
      this.initialErrorCondition = this.pendingErrorCondition();
    }
    if ((minLengthChanged || maxLengthChanged || minChanged || maxChanged || patternChanged) && cell.widget && cell.widget.type === 'input') {
      this.applyValidatorValues(cell);
      messages.push('Validation min/max/pattern values were applied.');
      this.initialMinLength = this.pendingMinLength();
      this.initialMaxLength = this.pendingMaxLength();
      this.initialMin = this.pendingMin();
      this.initialMax = this.pendingMax();
      this.initialPattern = this.pendingPattern();
    }

    if (messages.length) {
      this.notificationMessages.set(messages);
      setTimeout(() => this.notificationMessages.set([]), 4000);
    }
  }

  getSnippetPreview(snippet: { template: string; usesGroup?: boolean }): string {
    const ctrl = this.pendingFormControlName().trim() || 'controlName';
    const form = this.formGroupName();
    const grp = form;
    let expr = snippet.template.replace(/\{form\}/g, form);
    expr = expr.replace(/\{ctrl\}/g, ctrl);
    expr = expr.replace(/\{grp\}/g, grp);
    return expr;
  }

  /** Insert chosen snippet into the error rule input if not already present; user can then continue typing. Final string is bound to data-error-condition on Apply. */
  onInsertErrorSnippet(indexStr: string): void {
    if (indexStr === '' || indexStr == null) return;
    const i = Number(indexStr);
    const snippet = this.errorConditionSnippets[i] as ErrorConditionSnippet | undefined;
    if (!snippet) return;
    const inserted = this.getSnippetPreview(snippet).trim();
    const current = (this.pendingErrorCondition() || '').trim();
    if (current.includes(inserted)) {
      this.insertSnippetChoice.set('');
      return;
    }
    const next = current ? `${current} && ${inserted}` : inserted;
    this.pendingErrorCondition.set(next);
    this.insertSnippetChoice.set('');
  }

  /** Clear the error visibility rule (entire string). */
  clearErrorRule(): void {
    this.pendingErrorCondition.set('');
  }

  private parseOptionalNumber(s: string | number): number | undefined {
    if (typeof s === 'number') return Number.isNaN(s) ? undefined : s;
    const n = Number(String(s).trim());
    return String(s).trim() !== '' && !Number.isNaN(n) ? n : undefined;
  }

  private applyValidatorValues(cell: CanvasCell): void {
    const w = cell.widget;
    if (!w || w.type !== 'input') return;
    const nested = this.selectedNestedPath();
    const minLength = this.parseOptionalNumber(this.pendingMinLength());
    const maxLength = this.parseOptionalNumber(this.pendingMaxLength());
    const min = this.parseOptionalNumber(this.pendingMin());
    const max = this.parseOptionalNumber(this.pendingMax());
    const pattern = (this.pendingPattern().trim() || undefined) as string | undefined;
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      this.canvas.updateNestedWidgetMinLength(parentCellId, parentWidgetId, nestedCellId, w.id, minLength);
      this.canvas.updateNestedWidgetMaxLength(parentCellId, parentWidgetId, nestedCellId, w.id, maxLength);
      this.canvas.updateNestedWidgetMin(parentCellId, parentWidgetId, nestedCellId, w.id, min);
      this.canvas.updateNestedWidgetMax(parentCellId, parentWidgetId, nestedCellId, w.id, max);
      this.canvas.updateNestedWidgetPattern(parentCellId, parentWidgetId, nestedCellId, w.id, pattern);
    } else {
      this.canvas.updateWidgetMinLength(cell.id, w.id, minLength);
      this.canvas.updateWidgetMaxLength(cell.id, w.id, maxLength);
      this.canvas.updateWidgetMin(cell.id, w.id, min);
      this.canvas.updateWidgetMax(cell.id, w.id, max);
      this.canvas.updateWidgetPattern(cell.id, w.id, pattern);
    }
  }

  private applyErrorFields(cell: CanvasCell): void {
    const w = cell.widget;
    if (!w || !['input', 'checkbox', 'radio'].includes(w.type)) return;
    const nested = this.selectedNestedPath();
    const msg = this.pendingErrorMessage().trim() || undefined;
    const cond = this.pendingErrorCondition().trim() || undefined;
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      this.canvas.updateNestedWidgetErrorMessage(parentCellId, parentWidgetId, nestedCellId, w.id, msg ?? '');
      this.canvas.updateNestedWidgetErrorCondition(parentCellId, parentWidgetId, nestedCellId, w.id, cond ?? '');
    } else {
      this.canvas.updateWidgetErrorMessage(cell.id, w.id, msg ?? '');
      this.canvas.updateWidgetErrorCondition(cell.id, w.id, cond ?? '');
    }
  }

  private applyFormControlName(cell: CanvasCell): void {
    const w = cell.widget;
    if (!w || !['input', 'checkbox', 'radio'].includes(w.type)) return;
    const nested = this.selectedNestedPath();
    const name = this.pendingFormControlName().trim() || undefined;
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      this.canvas.updateNestedWidgetFormControlName(parentCellId, parentWidgetId, nestedCellId, w.id, name ?? '');
    } else {
      this.canvas.updateWidgetFormControlName(cell.id, w.id, name ?? '');
    }
  }

  private applyPropertyBinding(cell: CanvasCell, propertyValue: string): void {
    const w = cell.widget;
    if (!w) return;
    const nested = this.selectedNestedPath();
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
        this.canvas.updateNestedOptionBinding(parentCellId, parentWidgetId, nestedCellId, w.id, this.selectedOptionIndex()!, propertyValue);
      } else {
        this.canvas.updateNestedValueBinding(parentCellId, parentWidgetId, nestedCellId, w.id, propertyValue);
      }
    } else {
      if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
        this.canvas.updateOptionBinding(cell.id, w.id, this.selectedOptionIndex()!, propertyValue);
      } else {
        this.canvas.updateValueBinding(cell.id, w.id, propertyValue);
      }
    }
  }

  /** Label for which element gets the class (cell, component wrapper, component, or child element). */
  getClassTargetLabel(): string {
    const t = this.selectedTarget();
    const key = this.selectedElementKey();
    if (t === 'cell') return 'cell';
    if (t === 'widget') return 'component wrapper';
    if (t === 'element' && key) return `element (${key})`;
    return 'component';
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

  /** Error condition string to use for visibility (pending or saved). */
  getEffectiveErrorCondition(cell: CanvasCell | null): string {
    if (!cell?.widget) return '';
    return (this.pendingErrorCondition() || cell.widget.errorCondition || '').trim();
  }

  /** True if the condition references any validator that needs a value (minlength, maxlength, min, max, pattern). */
  showValidatorValuesSection(cell: CanvasCell | null): boolean {
    const cond = this.getEffectiveErrorCondition(cell);
    return (
      cond.includes('minlength') ||
      cond.includes('maxlength') ||
      /\[\s*['"]min['"]\s*\]/.test(cond) ||
      /\[\s*['"]max['"]\s*\]/.test(cond) ||
      cond.includes('pattern')
    );
  }

  showMinLengthInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveErrorCondition(cell).includes('minlength');
  }

  showMaxLengthInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveErrorCondition(cell).includes('maxlength');
  }

  showMinInput(cell: CanvasCell | null): boolean {
    return /\[\s*['"]min['"]\s*\]/.test(this.getEffectiveErrorCondition(cell));
  }

  showMaxInput(cell: CanvasCell | null): boolean {
    return /\[\s*['"]max['"]\s*\]/.test(this.getEffectiveErrorCondition(cell));
  }

  showPatternInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveErrorCondition(cell).includes('pattern');
  }

  /** Get the current binding as a property name (e.g. "listValue1") for the dropdown. */
  getCurrentBindingProperty(cell: CanvasCell): string {
    const w = cell.widget;
    if (!w) return '';
    if (w.type === 'radio' && this.selectedOptionIndex() !== null) {
      const binding = w.optionBindings?.[this.selectedOptionIndex()!];
      return parseBindingProperty(binding);
    }
    return parseBindingProperty(w.valueBinding);
  }
}
