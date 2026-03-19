import { Component, inject, signal, computed, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { DropdownAutocompleteComponent, type DropdownAutocompleteOption } from "../../../../shared/components/dropdown-autocomplete/dropdown-autocomplete.component";
import { stripBuilderChrome, copyFormValues, stripComponentWrappers } from "../../../../shared/utils/preview-html.util";
import { CanvasService } from "../../../../core/services/canvas.service";
import { SavedLayoutsService, type SavedLayout } from "../../../../core/services/saved-layouts.service";
import { LayoutGuardService } from "../../../../core/services/layout-guard.service";
import { WidgetRendererComponent } from "../../../../shared/components/widget-renderer/widget-renderer.component";
import { PreviewModalComponent } from "../../../../shared/components/preview-modal/preview-modal.component";
import { LayoutNameDialogComponent } from "../../../../shared/components/layout-name-dialog/layout-name-dialog.component";
import { UploadTemplateDialogComponent, type UploadTemplateResult } from "../../../../shared/components/upload-template-dialog/upload-template-dialog.component";
import type { CanvasCell, CanvasState, WidgetType, NestedTableState, WidgetInstance } from "../../../../shared/models/canvas.model";
import { LayoutOption } from "../../../../shared/enums";
import type { LayoutActionType, LayoutDropPositionType } from "../../../../shared/enums";
import { getCanvasCellWidgets, getPrimaryWidget, FORM_CONTROL_WIDGET_TYPES, WIDGET_TYPES, WIDGET_TYPE_GRID, WIDGET_TYPE_TABLE } from "../../../../shared/models/canvas.model";
import { SelectedTarget, type SelectedTargetType } from "../../../../shared/enums";
import {
  computeMergeRange,
  canMergeFromRange,
  updateSelectionForCtrlClick,
} from "../../../../shared/utils/grid-selection.util";
import * as gridMerge from "../../../../shared/utils/grid-merge.util";
import { getElementKeyFromElement } from "../../../../shared/utils/element-target.util";
import { computeLayoutDropPosition } from "../../../../shared/utils/layout-drop.util";
import { FormLayoutNameDirective } from "../../../../shared/directives/form-layout-name.directive";
import { DEFAULT_LAYOUT_NAME, FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID } from "../../../../shared/constants/canvas.constants";
import { toSafeFilename } from "../../../../shared/utils/safe-filename.util";
import {
  validateUploadedHtmlDocument,
  extractCanvasStateFromUploadedHtml,
} from "../../../../shared/utils/uploaded-html-validation.util";
import { DragDropDataKey, DragDropCssClass } from "../../../../shared/constants/drag-drop.constants";
import { getWidgetTypeFromDragEvent } from "../../../../shared/utils/drag-drop.util";
import { LayoutAction, LayoutDropPosition } from "../../../../shared/enums";

@Component({
  selector: "app-canvas",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    DropdownAutocompleteComponent,
    WidgetRendererComponent,
    FormLayoutNameDirective,
  ],
  templateUrl: "./canvas.component.html",
  styleUrl: "./canvas.component.scss",
})
export class CanvasComponent {
  private readonly canvas = inject(CanvasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly savedLayouts = inject(SavedLayoutsService);
  private readonly layoutGuard = inject(LayoutGuardService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly layouts = this.savedLayouts.layouts;
  readonly selectedLayoutId = this.savedLayouts.selectedLayoutId;
  readonly selectedLayout = this.savedLayouts.selectedLayout;

  /** True when the user can save (current layout can be persisted/renamed). Enabled when a layout is selected. */
  readonly canSaveLayout = computed(() => this.savedLayouts.selectedLayout() != null);

  readonly rows = this.canvas.rows;
  readonly canUndo = this.canvas.canUndo;
  readonly selectedCell = this.canvas.selectedCell;
  readonly selectedGridColumnIndex = this.canvas.selectedGridColumnIndex;
  readonly selectedNestedPath = this.canvas.selectedNestedPath;
  readonly nestedSelectionPath = this.canvas.nestedSelectionPath;
  readonly nestedSelectionCells = this.canvas.nestedSelectionCells;

  /** Canvas (top-level) multi-cell selection. Cleared when user ctrl+clicks in embedded table. */
  readonly selectionCells = this.canvas.canvasSelectionCells;

  /** When dragging Row/Col from palette: { type, rowIndex, colIndex, position } for drop line preview. */
  readonly layoutDropPreview = signal<{
    type: LayoutActionType;
    rowIndex: number;
    colIndex: number;
    position: LayoutDropPositionType;
  } | null>(null);

  readonly mergeRange = computed(() => computeMergeRange(this.selectionCells()));
  readonly canMerge = computed(() => canMergeFromRange(this.mergeRange()));

  /** Merge possible on top-level canvas selection. */
  readonly canMergeCanvas = computed(() => this.canMerge());

  /** Merge possible on nested table selection (embedded table ctrl+click). */
  readonly canMergeNested = computed(() => this.canvas.canMergeNested());

  /** Show Merge when either canvas or nested has a mergeable selection. */
  readonly showMerge = computed(() => this.canMergeCanvas() || this.canMergeNested());

  /** Show Unmerge when a single merged cell (origin) is selected on the canvas (not in a nested table). */
  readonly showUnmerge = computed(() => {
    const cell = this.selectedCell();
    const nested = this.selectedNestedPath();
    if (!cell || nested) return false;
    return cell.isMergedOrigin && (cell.colSpan > 1 || cell.rowSpan > 1);
  });

  /** True when the current selection range contains a merged cell (so Delete row/column must be hidden until unmerge). */
  readonly selectionContainsMergedCell = computed(() => {
    if (this.selectedNestedPath() != null) return false;
    const range = this.mergeRange();
    if (!range || this.selectionCells().length === 0) return false;
    const rows = this.rows();
    const origin = gridMerge.getOriginCell(
      rows as { cells: gridMerge.MergeableCell[] }[],
      range.r0,
      range.c0
    );
    if (!origin) return false;
    return !!(origin.isMergedOrigin && ((origin.colSpan ?? 1) > 1 || (origin.rowSpan ?? 1) > 1));
  });

  /** True when − Row / − Col are shown (ctrl+click selection). */
  readonly showStructuralRemoveButtons = computed(() => {
    if (this.selectionCells().length > 0 && this.mergeRange()) return true;
    if (this.nestedSelectionPath() != null && this.nestedSelectionCells().length > 0 && this.getNestedMergeRange())
      return true;
    return false;
  });

  readonly layoutOptionNew = LayoutOption.NewLayout;

  /** When set to null, forces the dropdown to show "Select Template" (e.g. after cancel). Undefined = use selectedLayoutId. */
  private readonly layoutDropdownOverride = signal<string | null | undefined>(undefined);

  /** Value for the template dropdown; overrides selectedLayoutId when layoutDropdownOverride is set. */
  readonly layoutDropdownValue = computed(() => {
    const over = this.layoutDropdownOverride();
    if (over !== undefined) return over;
    return this.selectedLayoutId() ?? null;
  });

  readonly selectedLayoutName = computed(() => {
    const val = this.layoutDropdownValue();
    if (val === LayoutOption.NewLayout) return 'New Template';
    return this.savedLayouts.selectedLayout()?.name ?? '';
  });

  /** Options for the template dropdown: New Template and saved layouts. */
  readonly templateSelectOptions = computed((): DropdownAutocompleteOption[] => {
    const layouts = this.layouts();
    const options: DropdownAutocompleteOption[] = [
      { value: LayoutOption.NewLayout, label: "New Template" },
    ];
    layouts.forEach((l) => options.push({ value: l.id, label: l.name }));
    return options;
  });

  /** True when a saved template is selected (Clone creates a copy under a new name). */
  readonly canClone = computed(() => this.savedLayouts.selectedLayout() != null);

  @ViewChild("canvasFormRef") private canvasFormRef?: ElementRef<HTMLFormElement>;
  @ViewChild("templateDropdownRef") private templateDropdownRef?: DropdownAutocompleteComponent;

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().includes(`${rowIndex},${colIndex}`);
  }

  /** Resolves what the user clicked: element (with key), widget-inner, widget, or cell. Also returns widget id when clicking a widget. */
  private getSelectionTargetFromEvent(e: MouseEvent): { target: SelectedTargetType; elementKey?: string; widgetId?: string } {
    const clickedElement = e.target as Element;
    const widgetHost = clickedElement?.closest?.("app-widget-renderer");
    const widgetId = widgetHost?.getAttribute?.("data-widget-id") ?? undefined;
    const elementKey = getElementKeyFromElement(clickedElement);
    if (elementKey) return { target: SelectedTarget.Element, elementKey, widgetId };
    if (
      clickedElement?.closest?.("app-widget-input") ||
      clickedElement?.closest?.("app-widget-checkbox") ||
      clickedElement?.closest?.("app-widget-radio") ||
      clickedElement?.closest?.("app-widget-label") ||
      clickedElement?.closest?.("app-widget-table") ||
      clickedElement?.closest?.("app-widget-grid")
    ) {
      return { target: SelectedTarget.WidgetInner, widgetId };
    }
    if (widgetHost) return { target: SelectedTarget.Widget, widgetId };
    return { target: SelectedTarget.Cell };
  }

  /** Applies selection for a single cell click (opens right panel): sets selected cell and grid column if needed. */
  private applyCellSelection(cell: CanvasCell, e: MouseEvent): void {
    const { target, elementKey, widgetId } = this.getSelectionTargetFromEvent(e);
    this.canvas.setSelectedCell(cell.id, target, elementKey, widgetId);
    this.setGridColumnSelection(cell, e);
  }

  /** ctrl+click = add/remove from selection (for merge). Normal click = clear and open right panel. */
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number, cell: CanvasCell): void {
    this.canvas.clearNestedSelection();
    if (e.ctrlKey) {
      this.canvas.setCanvasSelection(updateSelectionForCtrlClick(this.selectionCells(), rowIndex, colIndex));
      return;
    }
    this.clearSelection();
    const hasFormControl = getCanvasCellWidgets(cell).some((w) => (FORM_CONTROL_WIDGET_TYPES as readonly string[]).includes(w.type));
    if (hasFormControl && !this.layoutGuard.hasLayoutNamed()) {
      this.layoutGuard.ensureLayoutNamed().then((ok) => {
        if (ok) {
          this.applyCellSelection(cell, e);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.applyCellSelection(cell, e);
    }
  }

  /** When cell is a grid: set selectedGridColumnIndex from header, body, or footer cell click (any column cell), or null for grid-level. */
  private setGridColumnSelection(cell: CanvasCell, e: MouseEvent): void {
    if (getPrimaryWidget(cell)?.type !== WIDGET_TYPE_GRID) return;
    const el = e.target as Element;
    const headerCell = el.closest("th[mat-header-cell]");
    const bodyCell = el.closest("td[mat-cell]");
    const footerCell = el.closest("td[mat-footer-cell]");
    const columnCell = headerCell ?? bodyCell ?? footerCell;
    if (columnCell) {
      const tr = columnCell.closest("tr");
      const idx = tr ? Array.from(tr.children).indexOf(columnCell) : -1;
      this.canvas.setSelectedGridColumnIndex(idx >= 0 ? idx : null);
    } else {
      this.canvas.setSelectedGridColumnIndex(null);
    }
  }

  clearSelection(): void {
    this.canvas.clearCanvasSelection();
  }

  mergeSelection(): void {
    const range = this.mergeRange();
    if (!range || !this.canMerge()) return;
    const { r0, c0, r1, c1 } = range;
    this.canvas.mergeCells(r0, c0, r1, c1);
    this.clearSelection();
  }

  /** Run merge: nested table or canvas depending on current selection. */
  runMerge(): void {
    if (this.canvas.canMergeNested()) {
      this.canvas.mergeNestedSelection();
      this.cdr.detectChanges();
    } else if (this.canMerge()) {
      this.mergeSelection();
    }
  }

  /** Unmerge the selected merged cell (top-level canvas). Content stays in the top-left cell; other cells become empty. */
  runUnmerge(): void {
    if (this.selectedNestedPath()) return;
    let originRow: number;
    let originCol: number;
    const cell = this.selectedCell();
    if (cell?.isMergedOrigin && (cell.colSpan > 1 || cell.rowSpan > 1)) {
      originRow = cell.rowIndex;
      originCol = cell.colIndex;
    } else if (this.selectionContainsMergedCell()) {
      const range = this.mergeRange();
      if (!range) return;
      const origin = gridMerge.getOriginCell(
        this.rows() as { cells: gridMerge.MergeableCell[] }[],
        range.r0,
        range.c0
      );
      if (!origin?.isMergedOrigin || ((origin.colSpan ?? 1) <= 1 && (origin.rowSpan ?? 1) <= 1)) return;
      originRow = origin.rowIndex;
      originCol = origin.colIndex;
    } else {
      return;
    }
    this.canvas.unmergeCell(originRow, originCol);
    this.canvas.setSelectedCell(null);
    this.clearSelection();
  }

  hasSelection(): boolean {
    return this.selectionCells().length > 0;
  }

  /** Returns the list of widgets in a cell (stacked vertically in the UI). */
  cellWidgets(cell: CanvasCell): WidgetInstance[] {
    return getCanvasCellWidgets(cell);
  }

  /** True if the cell contains at least one embedded table widget (for CSS class). */
  cellHasEmbeddedTable(cell: CanvasCell): boolean {
    return getCanvasCellWidgets(cell).some((w) => w.type === WIDGET_TYPE_TABLE);
  }

  onDrop(e: DragEvent, targetCell: CanvasCell): void {
    e.preventDefault();
    e.stopPropagation();
    const td = this.getCellElement(e);
    if (this.tryHandleMoveDrop(e, targetCell, td)) return;
    if (this.tryHandleGridActionDrop(e, targetCell, td)) return;
    if (this.tryHandleLayoutActionDrop(e, targetCell, td)) return;
    this.tryHandleWidgetDrop(e, targetCell, td);
  }

  private getCellElement(e: DragEvent): HTMLElement | undefined {
    return ((e.currentTarget as HTMLElement).closest?.("td") ?? e.currentTarget) as HTMLElement;
  }

  private removeDragOverClass(e: DragEvent): void {
    this.getCellElement(e)?.classList.remove(DragDropCssClass.CellDragOver);
  }

  private tryHandleMoveDrop(e: DragEvent, targetCell: CanvasCell, td: HTMLElement | undefined): boolean {
    const moveData = e.dataTransfer?.getData(DragDropDataKey.CanvasMove);
    if (!moveData) return false;
    try {
      const { fromCellId, widget } = JSON.parse(moveData) as { fromCellId: string; widget: WidgetInstance };
      if (targetCell.isMergedOrigin && widget) this.canvas.moveWidget(fromCellId, targetCell.id, widget);
    } catch {
      // bad payload, skip
    }
    this.removeDragOverClass(e);
    return true;
  }

  private tryHandleGridActionDrop(e: DragEvent, targetCell: CanvasCell, _td: HTMLElement | undefined): boolean {
    const gridAction = e.dataTransfer?.getData(DragDropDataKey.GridAction) || undefined;
    if (gridAction !== LayoutAction.Row && gridAction !== LayoutAction.Col) return false;
    const gridWidget = getCanvasCellWidgets(targetCell).find((w) => w.type === WIDGET_TYPE_GRID);
    if (gridWidget) {
      if (gridAction === LayoutAction.Row) this.canvas.addGridRow(targetCell.id, gridWidget.id);
      else this.canvas.addGridColumn(targetCell.id, gridWidget.id);
    }
    this.removeDragOverClass(e);
    return true;
  }

  private tryHandleLayoutActionDrop(e: DragEvent, targetCell: CanvasCell, _td: HTMLElement | undefined): boolean {
    const layoutAction = e.dataTransfer?.getData(DragDropDataKey.LayoutAction) || e.dataTransfer?.getData("text/plain");
    if (layoutAction !== LayoutAction.Row && layoutAction !== LayoutAction.Col) {
      this.layoutDropPreview.set(null);
      return false;
    }
    if (getPrimaryWidget(targetCell)?.type === WIDGET_TYPE_GRID) {
      this.removeDragOverClass(e);
      return true;
    }
    const preview = this.layoutDropPreview();
    const pos =
      preview?.rowIndex === targetCell.rowIndex && preview?.colIndex === targetCell.colIndex
        ? preview.position
        : LayoutDropPosition.Before;
    if (targetCell.isMergedOrigin) {
      if (layoutAction === LayoutAction.Row) {
        this.canvas.addRowAt(pos === LayoutDropPosition.After ? targetCell.rowIndex + 1 : targetCell.rowIndex);
      } else {
        this.canvas.addColumnAt(pos === LayoutDropPosition.After ? targetCell.colIndex + 1 : targetCell.colIndex);
      }
    }
    this.layoutDropPreview.set(null);
    this.removeDragOverClass(e);
    return true;
  }

  private tryHandleWidgetDrop(e: DragEvent, targetCell: CanvasCell, _td: HTMLElement | undefined): void {
    this.layoutDropPreview.set(null);
    const type = getWidgetTypeFromDragEvent(e);
    if (!type || !targetCell.isMergedOrigin) return;
    this.canvas.setWidgetAt(targetCell.rowIndex, targetCell.colIndex, type);
    this.removeDragOverClass(e);
  }

  onDragOver(e: DragEvent, targetCell: CanvasCell): void {
    e.preventDefault();
    const el = this.getCellElement(e);
    const types = e.dataTransfer?.types;
    const typeList = types ? Array.from(types) : [];
    if (this.isGridActionDrag(typeList)) {
      this.handleGridActionDragOver(e, targetCell, el);
      return;
    }
    e.dataTransfer!.dropEffect = typeList.includes(DragDropDataKey.CanvasMove) ? "move" : "copy";
    el?.classList.add(DragDropCssClass.CellDragOver);
    if (this.isLayoutActionDrag(typeList)) {
      this.updateLayoutDropPreview(e, targetCell, el);
    } else {
      this.layoutDropPreview.set(null);
    }
  }

  private isGridActionDrag(types: string[]): boolean {
    return types.includes(DragDropDataKey.GridActionRow) || types.includes(DragDropDataKey.GridActionCol);
  }

  private isLayoutActionDrag(types: string[]): boolean {
    return types.includes(DragDropDataKey.LayoutActionRow) || types.includes(DragDropDataKey.LayoutActionCol);
  }

  private handleGridActionDragOver(e: DragEvent, targetCell: CanvasCell, el: HTMLElement | undefined): void {
    const hasGrid = getCanvasCellWidgets(targetCell).some((w) => w.type === WIDGET_TYPE_GRID);
    if (hasGrid) {
      el?.classList.add(DragDropCssClass.CellDragOver);
      e.dataTransfer!.dropEffect = "copy";
    } else {
      e.dataTransfer!.dropEffect = "none";
    }
    this.layoutDropPreview.set(null);
  }

  private updateLayoutDropPreview(e: DragEvent, targetCell: CanvasCell, el: HTMLElement | undefined): void {
    if (getPrimaryWidget(targetCell)?.type === WIDGET_TYPE_GRID || !targetCell.isMergedOrigin) return;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
    const type = types.includes(DragDropDataKey.LayoutActionRow) ? LayoutAction.Row : LayoutAction.Col;
    const position = computeLayoutDropPosition(rect, e.clientX, e.clientY, type);
    this.layoutDropPreview.set({ type, rowIndex: targetCell.rowIndex, colIndex: targetCell.colIndex, position });
  }

  onDragLeave(e: DragEvent): void {
    this.removeDragOverClass(e);
  }

  onEmptyStateDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.selectedLayoutId()) return;
    const type = getWidgetTypeFromDragEvent(e);
    if (type !== WIDGET_TYPE_TABLE) return;
    (e.currentTarget as HTMLElement)?.classList.remove(DragDropCssClass.EmptyStateDragOver);
    this.canvas.setWidgetOnEmptyCanvas(type);
  }

  onEmptyStateDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.selectedLayoutId()) {
      e.dataTransfer!.dropEffect = "none";
      return;
    }
    const type = getWidgetTypeFromDragEvent(e);
    (e.currentTarget as HTMLElement)?.classList.toggle(DragDropCssClass.EmptyStateDragOver, type === WIDGET_TYPE_TABLE);
    e.dataTransfer!.dropEffect = type === WIDGET_TYPE_TABLE ? "copy" : "none";
  }

  onEmptyStateDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement)?.classList.remove(DragDropCssClass.EmptyStateDragOver);
  }

  onTableDragLeave(e: DragEvent): void {
    const related = e.relatedTarget as Node | null;
    const table = e.currentTarget as HTMLElement;
    if (!related || !table.contains(related)) {
      this.layoutDropPreview.set(null);
    }
  }

  shouldSkipCell(rowIndex: number, colIndex: number): boolean {
    return this.canvas.shouldSkipRendering(rowIndex, colIndex);
  }

  getSpan(rowIndex: number, colIndex: number): { colSpan: number; rowSpan: number } {
    return this.canvas.getSpan(rowIndex, colIndex);
  }

  removeWidget(cellId: string, widgetId: string): void {
    this.canvas.removeWidget(cellId, widgetId);
  }

  /** When a nested cell is selected, returns its { rowIndex, colIndex } in that table; otherwise null. */
  getSelectedNestedRowCol(): { rowIndex: number; colIndex: number } | null {
    return this.canvas.getSelectedNestedRowCol();
  }

  /** Merge range for the current nested selection (for − Row / − Col index). */
  getNestedMergeRange(): { r0: number; r1: number; c0: number; c1: number } | null {
    return this.canvas.getNestedMergeRange();
  }

  /** Whether the selected nested table has more than one row (so − Row is allowed). */
  canRemoveNestedRow(path: { parentCellId: string; parentWidgetId: string }): boolean {
    const size = this.canvas.getNestedTableSize(path.parentCellId, path.parentWidgetId);
    return (size?.rowCount ?? 0) > 1;
  }

  /** Whether the selected nested table has more than one column (so − Col is allowed). */
  canRemoveNestedCol(path: { parentCellId: string; parentWidgetId: string }): boolean {
    const size = this.canvas.getNestedTableSize(path.parentCellId, path.parentWidgetId);
    return (size?.colCount ?? 0) > 1;
  }

  /** Single Row button: remove row from nested table if that's selected, else from canvas. */
  removeActiveRow(): void {
    const path = this.nestedSelectionPath();
    if (path != null && this.nestedSelectionCells().length > 0) {
      const range = this.getNestedMergeRange();
      if (range && this.canRemoveNestedRow(path)) {
        this.canvas.removeNestedRowAt(path.parentCellId, path.parentWidgetId, range.r0);
      }
    } else {
      const range = this.mergeRange();
      if (range && this.rows().length > 1) {
        this.canvas.removeRowAt(range.r0);
        this.clearSelection();
      }
    }
  }

  /** Single Col button: remove the entire column at the selected range. */
  removeActiveCol(): void {
    const path = this.nestedSelectionPath();
    if (path != null && this.nestedSelectionCells().length > 0) {
      const range = this.getNestedMergeRange();
      if (range && this.canRemoveNestedCol(path)) {
        this.canvas.removeNestedColumnAt(path.parentCellId, path.parentWidgetId, range.c0);
      }
    } else {
      const range = this.mergeRange();
      if (range && this.rows().length > 0 && this.rows()[0].cells.length > 1) {
        this.canvas.removeColumnAt(range.c0);
        this.clearSelection();
      }
    }
  }

  /** Show − Row only when a single row is selected (one cell or one full row), not when multiple rows are selected. */
  readonly showRemoveRow = computed(() => {
    const nestedPath = this.nestedSelectionPath();
    if (nestedPath != null && this.nestedSelectionCells().length > 0) {
      const range = this.getNestedMergeRange();
      if (!range || range.r0 !== range.r1) return false;
      return this.canRemoveNestedRow(nestedPath);
    }
    const range = this.mergeRange();
    if (!range || range.r0 !== range.r1) return false;
    return this.selectionCells().length > 0 && this.rows().length > 1;
  });

  /** Show − Col only when a single column is selected (one cell or one full column), not when multiple columns are selected. */
  readonly showRemoveCol = computed(() => {
    const nestedPath = this.nestedSelectionPath();
    if (nestedPath != null && this.nestedSelectionCells().length > 0) {
      const range = this.getNestedMergeRange();
      if (!range || range.c0 !== range.c1) return false;
      return this.canRemoveNestedCol(nestedPath);
    }
    const range = this.mergeRange();
    if (!range || range.c0 !== range.c1) return false;
    return this.selectionCells().length > 0 && this.rows().length > 0 && this.rows()[0].cells.length > 1;
  });

  removeNestedRowAt(parentCellId: string, parentWidgetId: string, rowIndex: number): void {
    this.canvas.removeNestedRowAt(parentCellId, parentWidgetId, rowIndex);
  }

  removeNestedColumnAt(parentCellId: string, parentWidgetId: string, colIndex: number): void {
    this.canvas.removeNestedColumnAt(parentCellId, parentWidgetId, colIndex);
  }

  removeRowAt(rowIndex: number): void {
    this.canvas.removeRowAt(rowIndex);
    this.clearSelection();
  }

  removeColumnAt(colIndex: number): void {
    this.canvas.removeColumnAt(colIndex);
    this.clearSelection();
  }

  onRadioOptionSelect(cellId: string, optionIndex: number): void {
    this.canvas.setSelectedCell(cellId);
    this.canvas.setSelectedOptionIndex(optionIndex);
  }

  updateNestedTable(cellId: string, widgetId: string, state: NestedTableState): void {
    this.canvas.updateNestedTable(cellId, widgetId, state);
  }

  updateWidgetLabel(cellId: string, widgetId: string, label: string): void {
    this.canvas.updateWidgetLabel(cellId, widgetId, label);
  }

  updateWidgetOptions(cellId: string, widgetId: string, options: string[]): void {
    this.canvas.updateWidgetOptions(cellId, widgetId, options);
  }

  isMergedCell(rowIndex: number, colIndex: number): boolean {
    const span = this.canvas.getSpan(rowIndex, colIndex);
    return span.colSpan > 1 || span.rowSpan > 1;
  }

  saveLayout(): void {
    const selected = this.savedLayouts.selectedLayout();
    const dialogRef = this.dialog.open(LayoutNameDialogComponent, {
      data: {
        title: "Save",
        defaultValue: selected?.name ?? "",
        layoutId: selected?.id ?? null,
      },
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result: { name: string; layoutId: string | null } | undefined) => {
      this.applySaveLayoutDialogResult(result);
    });
  }

  /** Writes the layout from the Save dialog into storage (update existing or add new). */
  private applySaveLayoutDialogResult(
    result: { name: string; layoutId: string | null } | undefined
  ): void {
    if (!result) return;
    const state = this.canvas.getStateForSave();
    const name = result.name.trim() || DEFAULT_LAYOUT_NAME;
    const html = this.getPreviewHtml();
    const clone = this.getPreviewClone();
    console.log("[Save layout] HTML string:", html);
    console.log("[Save layout] HTML element (clone):", clone);
    if (result.layoutId) {
      this.savedLayouts.updateLayout(result.layoutId, state, name);
    } else {
      this.savedLayouts.addLayout(name, state);
    }
    this.cdr.detectChanges();
  }

  /** Handles template dropdown change: New Template, Select Template, or a saved layout. */
  onLayoutSelect(value: string | null): void {
    this.layoutDropdownOverride.set(undefined);
    if (value === LayoutOption.NewLayout) {
      this.openNewLayoutDialog();
      return;
    }
    const currentId = this.selectedLayoutId();
    if (currentId && this.canvas.canUndo()) {
      const current = this.savedLayouts.getLayoutById(currentId);
      if (current) {
        this.savedLayouts.updateLayout(currentId, this.canvas.getStateForSave(), current.name);
      }
    }
    this.savedLayouts.selectLayout(value);
    this.canvas.clearUndoHistory();
    if (value) {
      const layout = this.savedLayouts.getLayoutById(value);
      if (layout) {
        this.canvas.loadState(layout.state);
      }
    } else {
      this.canvas.loadState(this.canvas.getDefaultState());
    }
  }

  /**
   * Clone the current template: prompt for a new name, then save a copy. The existing template is unchanged.
   */
  cloneLayout(): void {
    const current = this.savedLayouts.selectedLayout();
    if (!current) return;
    const dialogRef = this.dialog.open(LayoutNameDialogComponent, {
      data: {
        title: "Clone template",
        defaultValue: `${current.name} (copy)`,
        layoutId: null,
      },
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result: { name: string; layoutId: string | null } | undefined) => {
      this.applyCloneLayoutDialogResult(result, current);
    });
  }

  /** Creates a new saved layout from the clone dialog and loads it on the canvas. */
  private applyCloneLayoutDialogResult(
    result: { name: string; layoutId: string | null } | undefined,
    sourceLayout: SavedLayout
  ): void {
    if (!result) return;
    const name = result.name.trim() || DEFAULT_LAYOUT_NAME;
    const newLayout = this.savedLayouts.addLayout(name, sourceLayout.state);
    this.canvas.loadState(newLayout.state);
    this.canvas.clearUndoHistory();
    this.cdr.detectChanges();
  }

  /**
   * Opens the "Please enter layout name" dialog for creating a new template.
   * - While open: dropdown shows "New Template"
   * - On Cancel: dropdown reverts to "Select Template"
   * - On Save: creates the layout and selects it
   */
  private openNewLayoutDialog(): void {
    this.layoutDropdownOverride.set(LayoutOption.NewLayout);
    this.savedLayouts.selectLayout(null);
    this.canvas.loadState(this.canvas.getDefaultState());
    this.canvas.clearUndoHistory();
    this.canvas.setSelectedCell(null);
    this.clearSelection();
    this.canvas.clearNestedSelection();
    const dialogRef = this.dialog.open(LayoutNameDialogComponent, {
      data: {
        title: "Please enter layout name.",
        defaultValue: "",
        layoutId: null,
      },
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result: { name: string; layoutId: string | null } | undefined) => {
      if (!result) {
        this.layoutDropdownOverride.set(null);
        this.savedLayouts.selectLayout(null);
        this.cdr.detectChanges();
        return;
      }
      const name = result.name.trim() || DEFAULT_LAYOUT_NAME;
      const state = this.canvas.getInitialLayoutState();
      const newLayout = this.savedLayouts.addLayout(name, state);
      this.layoutDropdownOverride.set(undefined);
      this.onLayoutSelect(newLayout.id);
      this.canvas.setSelectedCell(null);
      this.clearSelection();
      this.canvas.clearNestedSelection();
      this.cdr.detectChanges();
      this.templateDropdownRef?.blurInput();
    });
  }

  undo(): void {
    this.canvas.undo();
    this.clearSelection();
  }

  /** Returns the cloned form element (builder chrome stripped). Use for preview/export or inspection. */
  getPreviewClone(): HTMLElement | null {
    this.cdr.detectChanges();
    const form = this.canvasFormRef?.nativeElement as HTMLElement | undefined;
    if (!form) return null;
    const clone = form.cloneNode(true) as HTMLElement;
    copyFormValues(form, clone);
    stripBuilderChrome(clone, { stripAngular: true });
    return clone;
  }

  /** Returns HTML string for preview/export: full form element (form tag and all content, builder chrome already stripped). */
  getPreviewHtml(): string {
    const clone = this.getPreviewClone();
    return clone ? clone.outerHTML : "";
  }

  /** Returns HTML for the layout only (canvas-content: table or empty state), so preview matches the visible canvas area. */
  getPreviewLayoutHtml(): string {
    const clone = this.getPreviewClone();
    if (!clone) return "";
    const content = clone.querySelector(".canvas-content");
    return content ? (content as HTMLElement).innerHTML : clone.outerHTML;
  }

  openPreview(): void {
    this.cdr.detectChanges();
    const html = this.getPreviewLayoutHtml();
    this.dialog.open(PreviewModalComponent, {
      data: { title: "HTML Preview", html },
      width: "90vw",
      maxWidth: "800px",
    });
  }

  downloadCanvasHtml(): void {
    const html = this.getPreviewHtml();
    if (!html) return;
    const layout = this.savedLayouts.selectedLayout();
    const filename = `${toSafeFilename(layout?.name)}.html`;
    const state = this.canvas.getStateForSave();
    const stateJson = JSON.stringify(state);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}<script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">${stateJson}</script></body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  openUploadTemplate(): void {
    const dialogRef = this.dialog.open(UploadTemplateDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result: UploadTemplateResult | undefined) => {
      this.handleUploadTemplateResult(result);
    });
  }

  /** Validates uploaded HTML (Unicode + html-validate), then loads layout JSON if present. */
  private handleUploadTemplateResult(result: UploadTemplateResult | undefined): void {
    if (!result?.content) return;
    const validation = validateUploadedHtmlDocument(result.content, result.fileName);
    if (!validation.ok) {
      this.snackBar.open(validation.summary, undefined, { duration: 5000 });
      return;
    }
    const state = extractCanvasStateFromUploadedHtml(result.content);
    if (!state) {
      this.snackBar.open("No template configuration found in file.", undefined, { duration: 4000 });
      return;
    }
    const baseName = result.fileName.replace(/\.html$/i, "") || "Uploaded template";
    const newLayout = this.savedLayouts.addLayout(baseName, state);
    this.onLayoutSelect(newLayout.id);
    this.canvas.setSelectedCell(null);
    this.clearSelection();
    this.cdr.detectChanges();
    this.templateDropdownRef?.blurInput();
    this.snackBar.open("Template loaded.", undefined, { duration: 2000 });
  }

  /** Returns the cloned form element (layout + native elements only, component tags stripped). */
  getPublishHtml(): HTMLElement | null {
    this.cdr.detectChanges();
    const container = (this.canvasFormRef?.nativeElement ??
      document.body.querySelector("form.canvas-form")) as HTMLElement | null;
    if (!container) return null;
    const clone = container.cloneNode(true) as HTMLElement;
    copyFormValues(container, clone);
    stripBuilderChrome(clone, { stripAngular: true });
    stripComponentWrappers(clone);
    return clone;
  }

  /** Publishes the form HTML (layout + native elements only). */
  publish(): void {
    const clone = this.getPublishHtml();
    console.log("[Publish] HTML element (clone):", clone);
    console.log("[Publish] HTML string:", clone?.outerHTML ?? "");
    this.snackBar.open("Form published.", undefined, {
      duration: 4000,
    });
  }
}
