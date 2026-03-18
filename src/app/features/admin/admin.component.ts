import { Component, inject, signal, effect, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { PaletteComponent } from './components/palette/palette.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { CanvasService } from '../../core/services/canvas.service';
import { SavedLayoutsService } from '../../core/services/saved-layouts.service';
import type { CanvasCell } from '../../shared/models/canvas.model';
import {
  getWidgetByIdOrPrimary,
  ACTIVITIES_BINDING_PATHS,
  DATA_COMPONENT_WIDGET_TYPES,
  WIDGET_TYPE_GRID,
  WIDGET_TYPE_INPUT,
  WIDGET_TYPE_RADIO,
  WIDGET_TYPE_TABLE,
} from '../../shared/models/canvas.model';
import type { TextAlignmentType } from '../../shared/enums';
import { SelectedTarget, TextAlignment } from '../../shared/enums';
import { getActivityPropertiesForPath } from '../../shared/constants/activity-structures.constants';
import { parseBindingProperty } from '../../shared/utils/binding.util';
import {
  VISIBILITY_CONDITION_SNIPPETS,
  type VisibilityConditionSnippet,
} from '../../shared/constants/visibility-condition.constants';
import { slugify } from '../../shared/utils/slugify.util';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, PaletteComponent, CanvasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly canvas = inject(CanvasService);
  private readonly savedLayouts = inject(SavedLayoutsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Expose widget type constants for use in the template (avoid magic strings). */
  readonly widgetTypeGrid = WIDGET_TYPE_GRID;
  readonly widgetTypeInput = WIDGET_TYPE_INPUT;
  readonly widgetTypeTable = WIDGET_TYPE_TABLE;

  private static isDataComponentWidget(w: { type: string } | null | undefined): boolean {
    return !!w && (DATA_COMPONENT_WIDGET_TYPES as readonly string[]).includes(w.type);
  }

  /** Returns the widget being edited: the one that was clicked (selectedWidgetId) or the first in the cell. */
  getSelectedWidget(cell: CanvasCell | null) {
    return cell ? getWidgetByIdOrPrimary(cell, this.canvas.selectedWidgetId()) : null;
  }

  /** True when the user clicked the cell (td) itself, so we show only cell configuration (e.g. class). */
  isCellSelection(): boolean {
    return this.selectedTarget() === SelectedTarget.Cell;
  }

  /** Control name (form control name) only for data components (label, input, checkbox, radio). Not for table, grid, or panel. */
  showControlNameSection(cell: CanvasCell | null): boolean {
    return !this.isCellSelection() && AdminComponent.isDataComponentWidget(this.getSelectedWidget(cell));
  }

  readonly selectedCell = this.canvas.selectedCell;
  readonly selectedNestedPath = this.canvas.selectedNestedPath;
  readonly selectedTarget = this.canvas.selectedTarget;
  readonly selectedElementKey = this.canvas.selectedElementKey;
  readonly bindableProperties = this.canvas.bindableProperties;
  readonly bindablePropertiesGrid = this.canvas.bindablePropertiesGrid;
  readonly bindablePropertiesColumn = this.canvas.bindablePropertiesColumn;
  readonly selectedGridColumnIndex = this.canvas.selectedGridColumnIndex;
  readonly selectedOptionIndex = this.canvas.selectedOptionIndex;

  /** True when the selected grid cell has a valueBinding that points to an activities array (grid-level choice). */
  readonly gridHasActivitiesBinding = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type !== WIDGET_TYPE_GRID) return false;
    const path = parseBindingProperty(w.valueBinding);
    return (ACTIVITIES_BINDING_PATHS as readonly string[]).includes(path);
  });

  /** For grid: grid-level = only activities (user chooses data once); column-level uses child dropdown only. For non-grid use full list. */
  readonly effectiveBindableProperties = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type !== WIDGET_TYPE_GRID) return this.bindableProperties;
    return this.bindablePropertiesColumn;
  });

  /** Show the main Data Binding (activities) dropdown whenever we're on a grid (grid-level or any column), so the chosen activity is always visible. */
  readonly showMainDataBindingDropdown = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type === WIDGET_TYPE_TABLE) return false;
    if (w.type !== WIDGET_TYPE_GRID) return true;
    return true;
  });

  /** Disable Apply when a data component is selected and control name is empty. When cell is selected, Apply is enabled (cell class only). */
  readonly applyDisabled = computed(() => {
    if (this.selectedTarget() === SelectedTarget.Cell) return false;
    const cell = this.selectedCell();
    const w = cell ? getWidgetByIdOrPrimary(cell, this.canvas.selectedWidgetId()) : null;
    if (!w || !AdminComponent.isDataComponentWidget(w)) return false;
    return !(this.pendingFormControlName() ?? '').trim();
  });

  /** When a column is selected and the grid already has an activity chosen, disable the activities dropdown so the user sees the choice but only edits the child dropdown for this column. */
  readonly isActivitiesDropdownDisabled = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type !== WIDGET_TYPE_GRID) return false;
    return this.selectedGridColumnIndex() !== null && this.gridHasActivitiesBinding();
  });

  /** Child dropdown options: loaded from the structure for the chosen activities type (saved on grid or currently selected in dropdown). */
  readonly effectiveActivityDataProperties = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type !== WIDGET_TYPE_GRID) return getActivityPropertiesForPath('');
    const path = parseBindingProperty(w.valueBinding) || this.pendingProperty() || '';
    return getActivityPropertiesForPath(path);
  });

  /** True when to show the child "Property from activity" dropdown: when a column is selected AND an activity is chosen (saved on grid or currently selected in the activities dropdown). */
  readonly showActivityDataDropdown = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w || w.type !== WIDGET_TYPE_GRID) return false;
    if (this.selectedGridColumnIndex() === null) return false;
    if (this.gridHasActivitiesBinding()) return true;
    const pending = this.pendingProperty();
    return (ACTIVITIES_BINDING_PATHS as readonly string[]).includes(pending ?? '');
  });

  /** Pending values in the form (not applied until Apply is clicked). */
  readonly pendingClass = signal('');
  readonly pendingProperty = signal('');
  /** For grid column: alignment, column header text, header text, header alignment, footer text, footer alignment, sortable. Class reuses pendingClass. */
  readonly pendingGridColumnAlignment = signal<TextAlignmentType | ''>('');
  readonly pendingGridColumnName = signal('');
  readonly pendingGridHeaderText = signal('');
  readonly pendingGridHeaderAlignment = signal<TextAlignmentType | ''>('');
  readonly pendingGridFooterText = signal('');
  readonly pendingGridFooterAlignment = signal<TextAlignmentType | ''>('');
  readonly pendingGridSortable = signal(false);
  /** When binding is Activities/Non-AMS Activities, selected property from the activity object (e.g. entryDate, amount). */
  readonly pendingActivityDataProperty = signal('');
  readonly pendingFormControlName = signal('');
  readonly pendingVisibilityCondition = signal('');
  readonly pendingMinLength = signal('');
  readonly pendingMaxLength = signal('');
  readonly pendingMin = signal('');
  readonly pendingMax = signal('');
  readonly pendingPattern = signal('');
  /** Selected index for "Insert rule" dropdown (reset after insert so user can continue typing). */
  readonly insertSnippetChoice = signal<string>('');
  /** Add rule modal open state */
  readonly addRuleModalOpen = signal(false);
  /** Snapshot when panel opened / last apply (to detect what changed). */
  private initialClass = '';
  private initialProperty = '';
  private initialActivityDataProperty = '';
  private initialGridColumnAlignment: TextAlignmentType | '' = '';
  private initialGridColumnName = '';
  private initialGridHeaderText = '';
  private initialGridHeaderAlignment: TextAlignmentType | '' = '';
  private initialGridFooterText = '';
  private initialGridFooterAlignment: TextAlignmentType | '' = '';
  private initialGridSortable = false;
  private initialFormControlName = '';
  private initialVisibilityCondition = '';
  private initialMinLength = '';
  private initialMaxLength = '';
  private initialMin = '';
  private initialMax = '';
  private initialPattern = '';

  readonly visibilityConditionSnippets = VISIBILITY_CONDITION_SNIPPETS;

  closeRightPanel(): void {
    this.canvas.setSelectedCell(null);
  }

  /** Form group name from layout (slugified) for snippet placeholders */
  readonly formGroupName = computed(() => {
    const layout = this.savedLayouts.selectedLayout();
    return slugify(layout?.name?.trim() ?? 'form');
  });

  /** True when the right panel should show the visibility condition block. Shown for data components and table; hidden for grid (no visibility rule for grid or header text). */
  readonly showVisibilityConditionSection = computed(() => {
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (!w) return false;
    if (w.type === WIDGET_TYPE_GRID) return false;
    return true;
  });

  constructor() {
    effect(() => {
      const cell = this.selectedCell();
      this.insertSnippetChoice.set('');
      if (cell) {
        this.syncInitialClassFromCell(cell);
        this.syncInitialBindingAndFormControl(cell);
        this.syncInitialGridColumnStyle(cell);
        this.syncInitialVisibilityFromCell(cell);
        this.syncInitialValidatorValuesFromCell(cell);
        this.copyInitialsToPending();
      }
    });
  }

  /** Fills initialClass from the selected cell (element, widget, widget-inner, cell, or grid column). */
  private syncInitialClassFromCell(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    if (w?.type === WIDGET_TYPE_GRID && this.selectedGridColumnIndex() !== null) {
      const cols = w.gridColumns ?? [];
      const col = cols[this.selectedGridColumnIndex()!];
      this.initialClass = col?.className ?? '';
      return;
    }
    const target = this.selectedTarget();
    const elementKey = this.selectedElementKey();
    if (target === SelectedTarget.Element && elementKey) {
      this.initialClass = w?.elementClasses?.[elementKey] ?? '';
    } else if (target === SelectedTarget.Widget && w) {
      this.initialClass = w.className ?? '';
    } else if (target === SelectedTarget.WidgetInner && w) {
      this.initialClass = w.innerClassName ?? '';
    } else {
      this.initialClass = (cell as { className?: string }).className ?? '';
    }
  }

  /** Fills initialProperty, initialActivityDataProperty, and initialFormControlName from the cell. */
  private syncInitialBindingAndFormControl(cell: CanvasCell): void {
    this.initialProperty = this.getCurrentBindingProperty(cell);
    this.initialActivityDataProperty = this.getCurrentActivityDataProperty(cell);
    const w = this.getSelectedWidget(cell);
    this.initialFormControlName = AdminComponent.isDataComponentWidget(w)
      ? (w?.formControlName ?? '')
      : '';
  }

  /** Fills initial grid header/footer (table-level) and, when a column is selected, column props. */
  private syncInitialGridColumnStyle(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID) return;
    this.initialGridHeaderText = w.gridHeaderText ?? '';
    this.initialGridHeaderAlignment =
      (w.gridHeaderAlignment === TextAlignment.Left ||
        w.gridHeaderAlignment === TextAlignment.Center ||
        w.gridHeaderAlignment === TextAlignment.Right)
        ? w.gridHeaderAlignment
        : '';
    this.initialGridFooterText = w.gridFooterText ?? '';
    this.initialGridFooterAlignment =
      (w.gridFooterAlignment === TextAlignment.Left ||
        w.gridFooterAlignment === TextAlignment.Center ||
        w.gridFooterAlignment === TextAlignment.Right)
        ? w.gridFooterAlignment
        : '';
    const colIdx = this.selectedGridColumnIndex();
    if (colIdx === null) {
      this.initialGridColumnAlignment = '';
      this.initialGridColumnName = '';
      this.initialGridSortable = false;
      return;
    }
    const cols = w.gridColumns ?? [];
    const col = cols[colIdx];
    this.initialGridColumnAlignment =
      (col?.alignment === TextAlignment.Left ||
        col?.alignment === TextAlignment.Center ||
        col?.alignment === TextAlignment.Right)
        ? col.alignment
        : '';
    this.initialGridColumnName = col?.columnName ?? '';
    this.initialGridHeaderAlignment =
      (col?.headerAlignment === TextAlignment.Left ||
        col?.headerAlignment === TextAlignment.Center ||
        col?.headerAlignment === TextAlignment.Right)
        ? col.headerAlignment
        : '';
    this.initialGridSortable = col?.sortable ?? false;
  }

  /** Fills initial visibility condition (for label, input, checkbox, radio). */
  private syncInitialVisibilityFromCell(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    const raw = w?.visibilityCondition ?? '';
    this.initialVisibilityCondition = raw;
  }

  /** Fills initial validator values (min/max length, min/max number, pattern) for inputs. */
  private syncInitialValidatorValuesFromCell(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    this.initialMinLength = w?.type === WIDGET_TYPE_INPUT && w.minLength != null ? String(w.minLength) : '';
    this.initialMaxLength = w?.type === WIDGET_TYPE_INPUT && w.maxLength != null ? String(w.maxLength) : '';
    this.initialMin = w?.type === WIDGET_TYPE_INPUT && w.min != null ? String(w.min) : '';
    this.initialMax = w?.type === WIDGET_TYPE_INPUT && w.max != null ? String(w.max) : '';
    this.initialPattern = w?.type === WIDGET_TYPE_INPUT && w.pattern != null ? String(w.pattern) : '';
  }

  /** Copies all initial* values into the pending* signals. */
  private copyInitialsToPending(): void {
    this.pendingClass.set(this.initialClass);
    this.pendingProperty.set(this.initialProperty);
    this.pendingActivityDataProperty.set(this.initialActivityDataProperty);
    this.pendingGridColumnAlignment.set(this.initialGridColumnAlignment);
    this.pendingGridColumnName.set(this.initialGridColumnName);
    this.pendingGridHeaderText.set(this.initialGridHeaderText);
    this.pendingGridHeaderAlignment.set(this.initialGridHeaderAlignment);
    this.pendingGridFooterText.set(this.initialGridFooterText);
    this.pendingGridFooterAlignment.set(this.initialGridFooterAlignment);
    this.pendingGridSortable.set(this.initialGridSortable);
    this.pendingFormControlName.set(this.initialFormControlName);
    this.pendingVisibilityCondition.set(this.initialVisibilityCondition);
    this.pendingMinLength.set(this.initialMinLength);
    this.pendingMaxLength.set(this.initialMaxLength);
    this.pendingMin.set(this.initialMin);
    this.pendingMax.set(this.initialMax);
    this.pendingPattern.set(this.initialPattern);
  }

  /** Called when Data Binding dropdown changes; clears activity-field selection when switching away from Activities. */
  onDataBindingChange(value: string): void {
    this.pendingProperty.set(value);
    if (!(ACTIVITIES_BINDING_PATHS as readonly string[]).includes(value ?? '')) {
      this.pendingActivityDataProperty.set('');
    }
  }

  closePanel(): void {
    this.insertSnippetChoice.set('');
    this.canvas.setSelectedCell(null);
  }

  /** Apply pending class and property, then show notification for what changed. */
  applyChanges(): void {
    const cell = this.selectedCell();
    if (!cell) return;

    if (AdminComponent.isDataComponentWidget(this.getSelectedWidget(cell))) {
      const name = (this.pendingFormControlName() ?? '').trim();
      if (!name) {
        this.snackBar.open('Control name is required for this component.', undefined, { duration: 4000 });
        return;
      }
    }

    const messages: string[] = [];
    this.applyClassChangeIfNeeded(cell, messages);
    this.applyPropertyChangeIfNeeded(cell, messages);
    this.applyFormControlNameChangeIfNeeded(cell, messages);
    this.applyVisibilityConditionChangeIfNeeded(cell, messages);
    this.applyValidatorValuesChangeIfNeeded(cell, messages);
    this.applyGridColumnAlignmentChangeIfNeeded(cell, messages);
    this.applyGridHeaderTextChangeIfNeeded(cell, messages);
    this.applyGridFooterTextChangeIfNeeded(cell, messages);
    this.applyGridColumnNameChangeIfNeeded(cell, messages);
    this.applyGridColumnDetailsChangeIfNeeded(cell, messages);

    if (messages.length) {
      this.snackBar.open(messages.join(' '), undefined, { duration: 4000 });
    } else {
      this.snackBar.open('Properties applied.', undefined, { duration: 2500 });
    }
    this.cdr.detectChanges();
  }

  private applyClassChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    if (this.pendingClass() !== this.initialClass) {
      this.applyClassChange(cell, messages);
    }
  }

  private applyPropertyChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const propertyChanged = this.pendingProperty() !== this.initialProperty;
    const gridColumnActivityChanged =
      this.getSelectedWidget(cell)?.type === WIDGET_TYPE_GRID &&
      this.selectedGridColumnIndex() !== null &&
      this.pendingActivityDataProperty() !== this.initialActivityDataProperty;
    if (propertyChanged || gridColumnActivityChanged) {
      this.applyPropertyChange(cell, messages);
    }
  }

  private applyFormControlNameChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const isFormControlWidget = AdminComponent.isDataComponentWidget(this.getSelectedWidget(cell));
    if (isFormControlWidget && this.pendingFormControlName() !== this.initialFormControlName) {
      this.applyFormControlNameChange(cell, messages);
    }
  }

  private applyVisibilityConditionChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const isDataComponent = AdminComponent.isDataComponentWidget(this.getSelectedWidget(cell));
    if (isDataComponent && this.pendingVisibilityCondition() !== this.initialVisibilityCondition) {
      this.applyVisibilityConditionChange(cell, messages);
    }
  }

  private applyValidatorValuesChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const validatorValuesChanged =
      this.pendingMinLength() !== this.initialMinLength ||
      this.pendingMaxLength() !== this.initialMaxLength ||
      this.pendingMin() !== this.initialMin ||
      this.pendingMax() !== this.initialMax ||
      this.pendingPattern() !== this.initialPattern;
    if (validatorValuesChanged && this.getSelectedWidget(cell)?.type === WIDGET_TYPE_INPUT) {
      this.applyValidatorValuesChange(cell, messages);
    }
  }

  private applyGridColumnAlignmentChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const isGridColumnSelected = this.getSelectedWidget(cell)?.type === WIDGET_TYPE_GRID && this.selectedGridColumnIndex() !== null;
    const alignmentChanged = this.pendingGridColumnAlignment() !== this.initialGridColumnAlignment;
    if (isGridColumnSelected && alignmentChanged) {
      this.applyGridColumnAlignmentChange(cell, messages);
    }
  }

  private applyGridHeaderTextChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID) return;
    const colIdx = this.selectedGridColumnIndex();
    const headerTextChanged = this.pendingGridHeaderText() !== this.initialGridHeaderText;
    const captionAlignChanged = colIdx === null && this.pendingGridHeaderAlignment() !== this.initialGridHeaderAlignment;
    if (!headerTextChanged && !captionAlignChanged) return;
    const headerAlign = colIdx === null ? this.pendingGridHeaderAlignment() : undefined;
    this.canvas.updateGridHeaderText(cell.id, w.id, this.pendingGridHeaderText(), headerAlign);
    this.initialGridHeaderText = this.pendingGridHeaderText();
    if (colIdx === null) this.initialGridHeaderAlignment = this.pendingGridHeaderAlignment();
    messages.push('Grid header was applied.');
  }

  private applyGridFooterTextChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID) return;
    const footerChanged =
      this.pendingGridFooterText() !== this.initialGridFooterText ||
      this.pendingGridFooterAlignment() !== this.initialGridFooterAlignment;
    if (!footerChanged) return;
    this.canvas.updateGridFooterText(
      cell.id,
      w.id,
      this.pendingGridFooterText(),
      this.pendingGridFooterAlignment()
    );
    this.initialGridFooterText = this.pendingGridFooterText();
    this.initialGridFooterAlignment = this.pendingGridFooterAlignment();
    messages.push('Grid footer was applied.');
  }

  private applyGridColumnNameChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const colIdx = this.selectedGridColumnIndex();
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID || colIdx === null) return;
    if (this.pendingGridColumnName() === this.initialGridColumnName) return;
    this.canvas.updateGridColumnName(cell.id, w.id, colIdx, this.pendingGridColumnName());
    this.initialGridColumnName = this.pendingGridColumnName();
    messages.push('Column header text was applied.');
  }

  private applyGridColumnDetailsChangeIfNeeded(cell: CanvasCell, messages: string[]): void {
    const colIdx = this.selectedGridColumnIndex();
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID || colIdx === null) return;
    const changed =
      this.pendingGridHeaderAlignment() !== this.initialGridHeaderAlignment ||
      this.pendingGridSortable() !== this.initialGridSortable;
    if (!changed) return;
    this.canvas.updateGridColumnDetails(
      cell.id,
      w.id,
      colIdx,
      this.pendingGridHeaderAlignment(),
      this.pendingGridSortable()
    );
    this.initialGridHeaderAlignment = this.pendingGridHeaderAlignment();
    this.initialGridSortable = this.pendingGridSortable();
    messages.push('Column details were applied.');
  }

  /** Applies the pending class to the cell/widget/element/grid-column and records the message. */
  private applyClassChange(cell: CanvasCell, messages: string[]): void {
    const newClass = this.pendingClass();
    if (this.tryApplyClassToGridColumn(cell, newClass, messages)) return;
    this.applyClassToCellOrWidget(cell, newClass, messages);
    messages.push(`Your class was bound to the ${this.getClassTargetLabel()}.`);
    this.initialClass = newClass;
  }

  private tryApplyClassToGridColumn(cell: CanvasCell, newClass: string, messages: string[]): boolean {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID || this.selectedGridColumnIndex() === null) return false;
    const colIdx = this.selectedGridColumnIndex()!;
    this.canvas.updateGridColumnClassAndAlignment(cell.id, w.id, colIdx, newClass, this.pendingGridColumnAlignment());
    this.initialClass = newClass;
    messages.push(`Your class was bound to the column.`);
    return true;
  }

  private applyClassToCellOrWidget(cell: CanvasCell, newClass: string, _messages: string[]): void {
    const target = this.selectedTarget();
    const elementKey = this.selectedElementKey();
    const nested = this.selectedNestedPath();
    if (nested) {
      this.applyClassToNestedTarget(cell, newClass, nested, target, elementKey);
    } else {
      this.applyClassToTopLevelTarget(cell, newClass, target, elementKey);
    }
  }

  private applyClassToNestedTarget(
    cell: CanvasCell,
    newClass: string,
    nested: { parentCellId: string; parentWidgetId: string; nestedCellId: string },
    target: string,
    elementKey: string | null
  ): void {
    const { parentCellId, parentWidgetId, nestedCellId } = nested;
    const w = this.getSelectedWidget(cell);
    if (target === SelectedTarget.Element && elementKey && w) {
      this.canvas.updateNestedWidgetElementClass(parentCellId, parentWidgetId, nestedCellId, w.id, elementKey, newClass);
    } else if (target === SelectedTarget.Widget && w) {
      this.canvas.updateNestedWidgetClass(parentCellId, parentWidgetId, nestedCellId, w.id, newClass);
    } else if (target === SelectedTarget.WidgetInner && w) {
      this.canvas.updateNestedWidgetInnerClass(parentCellId, parentWidgetId, nestedCellId, w.id, newClass);
    } else {
      this.canvas.updateNestedCellClass(parentCellId, parentWidgetId, nestedCellId, newClass);
    }
  }

  private applyClassToTopLevelTarget(cell: CanvasCell, newClass: string, target: string, elementKey: string | null): void {
    const w = this.getSelectedWidget(cell);
    if (target === SelectedTarget.Element && elementKey && w) {
      this.canvas.updateWidgetElementClass(cell.id, w.id, elementKey, newClass);
    } else if (target === SelectedTarget.Widget && w) {
      this.canvas.updateWidgetClass(cell.id, w.id, newClass);
    } else if (target === SelectedTarget.WidgetInner && w) {
      this.canvas.updateWidgetInnerClass(cell.id, w.id, newClass);
    } else {
      this.canvas.updateCellClass(cell.id, newClass);
    }
  }

  /** Applies the pending property binding and records the message. */
  private applyPropertyChange(cell: CanvasCell, messages: string[]): void {
    const colIdx = this.selectedGridColumnIndex();
    const w = this.getSelectedWidget(cell);
    if (w?.type === WIDGET_TYPE_GRID && colIdx !== null) {
      const activityProp = this.pendingActivityDataProperty();
      const valueBinding = this.gridHasActivitiesBinding()
        ? parseBindingProperty(w.valueBinding)
        : this.pendingProperty();
      const path = valueBinding || parseBindingProperty(w.valueBinding);
      const headerLabel = getActivityPropertiesForPath(path).find((p) => p.value === activityProp)?.label;
      this.canvas.updateGridColumnBinding(cell.id, w.id, colIdx, valueBinding, activityProp, headerLabel);
      if (valueBinding && (ACTIVITIES_BINDING_PATHS as readonly string[]).includes(valueBinding)) {
        this.canvas.updateValueBinding(cell.id, w.id, valueBinding);
      }
      this.initialProperty = valueBinding;
      this.initialActivityDataProperty = activityProp;
    } else {
      this.applyPropertyBinding(cell, this.pendingProperty());
      this.initialProperty = this.pendingProperty();
    }
    messages.push('Your property was bound to the component.');
  }

  /** Applies the pending form control name for input/checkbox/radio and records the message. */
  private applyFormControlNameChange(cell: CanvasCell, messages: string[]): void {
    this.applyFormControlName(cell);
    messages.push('Control name (data-form-control-name) was applied.');
    this.initialFormControlName = this.pendingFormControlName();
  }

  /** Applies grid column alignment when a column is selected. Class uses applyClassChange. */
  private applyGridColumnAlignmentChange(cell: CanvasCell, messages: string[]): void {
    const colIdx = this.selectedGridColumnIndex();
    const w = this.getSelectedWidget(cell);
    if (colIdx === null || !w || w.type !== WIDGET_TYPE_GRID) return;
    this.canvas.updateGridColumnClassAndAlignment(cell.id, w.id, colIdx, this.pendingClass(), this.pendingGridColumnAlignment());
    this.initialGridColumnAlignment = this.pendingGridColumnAlignment();
    messages.push('Column alignment was applied.');
  }

  /** Applies visibility condition to the selected data component (label, input, checkbox, radio). */
  private applyVisibilityConditionChange(cell: CanvasCell, messages: string[]): void {
    this.applyVisibilityCondition(cell);
    messages.push('Visibility condition was applied.');
    this.initialVisibilityCondition = this.pendingVisibilityCondition();
  }

  /** Applies pending validator values (min/max/pattern) for input and records the message. */
  private applyValidatorValuesChange(cell: CanvasCell, messages: string[]): void {
    this.applyValidatorValues(cell);
    messages.push('Validation min/max/pattern values were applied.');
    this.initialMinLength = this.pendingMinLength();
    this.initialMaxLength = this.pendingMaxLength();
    this.initialMin = this.pendingMin();
    this.initialMax = this.pendingMax();
    this.initialPattern = this.pendingPattern();
  }

  getSnippetPreview(snippet: { template: string; usesGroup?: boolean }): string {
    const ctrl = (this.pendingFormControlName() || '').trim() || 'controlName';
    const form = this.formGroupName();
    const grp = form;
    let expr = snippet.template.replace(/\{form\}/g, form);
    expr = expr.replace(/\{ctrl\}/g, ctrl);
    expr = expr.replace(/\{grp\}/g, grp);
    return expr;
  }

  /** Insert chosen snippet into the visibility condition input if not already present. Bound to data-visibility-condition on Apply. */
  onInsertVisibilitySnippet(indexStr: string): void {
    if (indexStr === '' || indexStr == null) return;
    const i = Number(indexStr);
    const snippet = this.visibilityConditionSnippets[i] as VisibilityConditionSnippet | undefined;
    if (!snippet) return;
    const inserted = this.getSnippetPreview(snippet).trim();
    const current = (this.pendingVisibilityCondition() || '').trim();
    if (current.includes(inserted)) {
      this.insertSnippetChoice.set('');
      return;
    }
    const next = current ? `${current} && ${inserted}` : inserted;
    this.pendingVisibilityCondition.set(next);
    this.insertSnippetChoice.set('');
  }

  /** Clear the visibility condition (entire string). */
  clearVisibilityRule(): void {
    this.pendingVisibilityCondition.set('');
  }

  openAddRuleModal(): void {
    this.addRuleModalOpen.set(true);
  }

  closeAddRuleModal(): void {
    this.addRuleModalOpen.set(false);
    this.insertSnippetChoice.set('');
  }

  insertRuleAndClose(): void {
    const v = this.insertSnippetChoice();
    if (v !== '' && v != null) this.onInsertVisibilitySnippet(v);
    this.closeAddRuleModal();
  }

  private parseOptionalNumber(s: string | number): number | undefined {
    if (typeof s === 'number') return Number.isNaN(s) ? undefined : s;
    const n = Number(String(s).trim());
    return String(s).trim() !== '' && !Number.isNaN(n) ? n : undefined;
  }

  private applyValidatorValues(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_INPUT) return;
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

  /** Apply visibility condition to the selected data component (label, input, checkbox, radio). */
  private applyVisibilityCondition(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    if (!w || !AdminComponent.isDataComponentWidget(w)) return;
    const cond = this.pendingVisibilityCondition().trim() || '';
    const nested = this.selectedNestedPath();
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      this.canvas.updateNestedWidgetVisibilityCondition(parentCellId, parentWidgetId, nestedCellId, w.id, cond);
    } else {
      this.canvas.updateWidgetVisibilityCondition(cell.id, w.id, cond);
    }
  }

  private applyFormControlName(cell: CanvasCell): void {
    const w = this.getSelectedWidget(cell);
    if (!w || !AdminComponent.isDataComponentWidget(w)) return;
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
    const w = this.getSelectedWidget(cell);
    if (!w) return;
    const nested = this.selectedNestedPath();
    if (nested) {
      const { parentCellId, parentWidgetId, nestedCellId } = nested;
      if (w.type === WIDGET_TYPE_RADIO && this.selectedOptionIndex() !== null) {
        this.canvas.updateNestedOptionBinding(parentCellId, parentWidgetId, nestedCellId, w.id, this.selectedOptionIndex()!, propertyValue);
      } else {
        this.canvas.updateNestedValueBinding(parentCellId, parentWidgetId, nestedCellId, w.id, propertyValue);
      }
    } else {
      if (w.type === WIDGET_TYPE_RADIO && this.selectedOptionIndex() !== null) {
        this.canvas.updateOptionBinding(cell.id, w.id, this.selectedOptionIndex()!, propertyValue);
      } else {
        this.canvas.updateValueBinding(cell.id, w.id, propertyValue);
      }
    }
  }

  /** Right panel title based on selection: "Cell Properties", "Label Properties", "Grid Properties", "Column 1 Properties", etc. */
  getPropertiesPanelTitle(): string {
    const cell = this.selectedCell();
    if (!cell) return 'Properties';
    if (this.selectedTarget() === SelectedTarget.Cell) return 'Cell Properties';
    const w = this.getSelectedWidget(cell);
    if (!w) return 'Cell Properties';
    if (w.type === WIDGET_TYPE_GRID) {
      const colIdx = this.selectedGridColumnIndex();
      if (colIdx !== null) return `Column ${colIdx + 1} Properties`;
      return 'Grid Properties';
    }
    const typeLabels: Record<string, string> = {
      input: 'Input',
      checkbox: 'Checkbox',
      radio: 'Radio',
      label: 'Label',
      table: 'Table',
      panel: 'Panel',
    };
    const name = typeLabels[w.type] ?? w.type;
    return `${name} Properties`;
  }

  /** Label for which element gets the class (cell, component wrapper, component, or child element). */
  getClassTargetLabel(): string {
    const columnIndex = this.selectedGridColumnIndex();
    const cell = this.selectedCell();
    const w = cell ? this.getSelectedWidget(cell) : null;
    if (w?.type === WIDGET_TYPE_GRID && columnIndex !== null) return `column ${columnIndex + 1}`;
    const target = this.selectedTarget();
    const elementKey = this.selectedElementKey();
    if (target === SelectedTarget.Cell) return 'cell';
    if (target === SelectedTarget.Widget) return 'component wrapper';
    if (target === SelectedTarget.Element && elementKey) return `element (${elementKey})`;
    return 'component';
  }

  /** Human-readable label for what the property binding applies to. */
  getBindingTargetLabel(cell: CanvasCell): string {
    const widget = this.getSelectedWidget(cell);
    if (!widget) return '';
    const typeLabels: Record<string, string> = {
      input: 'Input',
      checkbox: 'Checkbox',
      label: 'Label',
      radio: 'Radio',
      table: 'Table',
      grid: 'Grid',
      panel: 'Panel',
    };
    const base = typeLabels[widget.type] ?? widget.type;
    if (widget.type === WIDGET_TYPE_RADIO && this.selectedOptionIndex() !== null) {
      const optionIndex = this.selectedOptionIndex()!;
      const selectedOption = (widget.options ?? [])[optionIndex];
      const optionLabel = selectedOption ? `"${selectedOption}"` : `Option ${optionIndex + 1}`;
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

  /** Visibility condition string (pending or saved). */
  getEffectiveVisibilityCondition(cell: CanvasCell | null): string {
    const widget = this.getSelectedWidget(cell);
    if (!widget) return '';
    return (this.pendingVisibilityCondition() || widget.visibilityCondition || '').trim();
  }

  /** True if the condition references any validator that needs a value (minlength, maxlength, min, max, pattern). */
  showValidatorValuesSection(cell: CanvasCell | null): boolean {
    const cond = this.getEffectiveVisibilityCondition(cell);
    return (
      cond.includes('minlength') ||
      cond.includes('maxlength') ||
      /\[\s*['"]min['"]\s*\]/.test(cond) ||
      /\[\s*['"]max['"]\s*\]/.test(cond) ||
      cond.includes('pattern')
    );
  }

  showMinLengthInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveVisibilityCondition(cell).includes('minlength');
  }

  showMaxLengthInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveVisibilityCondition(cell).includes('maxlength');
  }

  showMinInput(cell: CanvasCell | null): boolean {
    return /\[\s*['"]min['"]\s*\]/.test(this.getEffectiveVisibilityCondition(cell));
  }

  showMaxInput(cell: CanvasCell | null): boolean {
    return /\[\s*['"]max['"]\s*\]/.test(this.getEffectiveVisibilityCondition(cell));
  }

  showPatternInput(cell: CanvasCell | null): boolean {
    return this.getEffectiveVisibilityCondition(cell).includes('pattern');
  }

  /** Get the current binding as a property name (e.g. "listValue1") for the dropdown. */
  getCurrentBindingProperty(cell: CanvasCell): string {
    const w = this.getSelectedWidget(cell);
    if (!w) return '';
    if (w.type === WIDGET_TYPE_GRID && this.selectedGridColumnIndex() !== null) {
      const cols = w.gridColumns ?? [];
      const col = cols[this.selectedGridColumnIndex()!];
      const colPath = col?.valueBinding ?? '';
      if (colPath) return colPath;
      if (this.gridHasActivitiesBinding()) return parseBindingProperty(w.valueBinding);
      return '';
    }
    if (w.type === WIDGET_TYPE_RADIO && this.selectedOptionIndex() !== null) {
      const binding = w.optionBindings?.[this.selectedOptionIndex()!];
      return parseBindingProperty(binding);
    }
    return parseBindingProperty(w.valueBinding);
  }

  /** For grid column: the activity field (e.g. amount, entryDate). */
  private getCurrentActivityDataProperty(cell: CanvasCell): string {
    const w = this.getSelectedWidget(cell);
    if (!w || w.type !== WIDGET_TYPE_GRID) return '';
    const colIdx = this.selectedGridColumnIndex();
    if (colIdx === null) return '';
    const cols = w.gridColumns ?? [];
    const col = cols[colIdx];
    return col?.activityDataProperty ?? '';
  }
}
