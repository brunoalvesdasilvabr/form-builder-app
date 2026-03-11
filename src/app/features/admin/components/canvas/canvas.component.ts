import { Component, inject, signal, computed, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { stripBuilderChrome, copyFormValues, stripComponentWrappers } from "../../../../shared/utils/preview-html.util";
import { CanvasService } from "../../../../core/services/canvas.service";
import { SavedLayoutsService } from "../../../../core/services/saved-layouts.service";
import { LayoutGuardService } from "../../../../core/services/layout-guard.service";
import { WidgetRendererComponent } from "../../../../shared/components/widget-renderer/widget-renderer.component";
import { PreviewModalComponent } from "../../../../shared/components/preview-modal/preview-modal.component";
import { LayoutNameDialogComponent } from "../../../../shared/components/layout-name-dialog/layout-name-dialog.component";
import type { CanvasCell, WidgetType, NestedTableState, WidgetInstance } from "../../../../shared/models/canvas.model";
import { LayoutOption } from "../../../../shared/enums";
import type { LayoutActionType, LayoutDropPositionType } from "../../../../shared/enums";
import { FORM_CONTROL_WIDGET_TYPES, WIDGET_TYPES, WIDGET_TYPE_GRID, WIDGET_TYPE_TABLE } from "../../../../shared/models/canvas.model";
import { SelectedTarget } from "../../../../shared/enums";
import {
  computeMergeRange,
  canMergeFromRange,
  updateSelectionForCtrlClick,
} from "../../../../shared/utils/grid-selection.util";
import { getElementKeyFromElement } from "../../../../shared/utils/element-target.util";
import { computeLayoutDropPosition } from "../../../../shared/utils/layout-drop.util";
import { FormLayoutNameDirective } from "../../../../shared/directives/form-layout-name.directive";
import { DEFAULT_LAYOUT_NAME } from "../../../../shared/constants/canvas.constants";
import { toSafeFilename } from "../../../../shared/utils/safe-filename.util";
import { DragDropDataKey, DragDropCssClass } from "../../../../shared/constants/drag-drop.constants";
import { LayoutAction, LayoutDropPosition } from "../../../../shared/enums";

@Component({
  selector: "app-canvas",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
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

  @ViewChild("canvasFormRef") private canvasFormRef?: ElementRef<HTMLFormElement>;

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().includes(`${rowIndex},${colIndex}`);
  }

  // ctrl+click = add/remove from selection (for merge). no ctrl = clear or open right panel
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number, cell: CanvasCell): void {
    this.canvas.clearNestedSelection();
    if (e.ctrlKey) {
      this.canvas.setCanvasSelection(updateSelectionForCtrlClick(this.selectionCells(), rowIndex, colIndex));
    } else {
      this.clearSelection();
      if (cell.widget && cell.widget.type === WIDGET_TYPE_TABLE) {
        this.canvas.setSelectedCell(null);
      } else {
        const hasFormControl = cell.widget && (FORM_CONTROL_WIDGET_TYPES as readonly string[]).includes(cell.widget.type);
        const doSelect = () => {
          const el = e.target as Element;
          const elementTarget = getElementKeyFromElement(el);
          if (elementTarget) {
            this.canvas.setSelectedCell(cell.id, SelectedTarget.Element, elementTarget);
          } else if (
            el?.closest?.("app-widget-input") ||
            el?.closest?.("app-widget-checkbox") ||
            el?.closest?.("app-widget-radio") ||
            el?.closest?.("app-widget-label") ||
            el?.closest?.("app-widget-table") ||
            el?.closest?.("app-widget-grid")
          ) {
            this.canvas.setSelectedCell(cell.id, SelectedTarget.WidgetInner);
          } else if (el?.closest?.("app-widget-renderer")) {
            this.canvas.setSelectedCell(cell.id, SelectedTarget.Widget);
          } else {
            this.canvas.setSelectedCell(cell.id, SelectedTarget.Cell);
          }
        };
        if (hasFormControl && !this.layoutGuard.hasLayoutNamed()) {
          this.layoutGuard.ensureLayoutNamed().then((ok) => {
            if (ok) {
              doSelect();
              this.setGridColumnSelection(cell, e);
              this.cdr.detectChanges();
            }
          });
        } else {
          doSelect();
          this.setGridColumnSelection(cell, e);
        }
      }
    }
  }

  /** When cell is a grid: set selectedGridColumnIndex from header, body, or footer cell click (any column cell), or null for grid-level. */
  private setGridColumnSelection(cell: CanvasCell, e: MouseEvent): void {
    if (cell.widget?.type !== WIDGET_TYPE_GRID) return;
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

  hasSelection(): boolean {
    return this.selectionCells().length > 0;
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
    if (targetCell.widget?.type === WIDGET_TYPE_GRID) {
      if (gridAction === LayoutAction.Row) this.canvas.addGridRow(targetCell.id, targetCell.widget.id);
      else this.canvas.addGridColumn(targetCell.id, targetCell.widget.id);
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
    if (targetCell.widget?.type === WIDGET_TYPE_GRID) {
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
    const raw = (e.dataTransfer?.getData(DragDropDataKey.WidgetType) || e.dataTransfer?.getData("text/plain") || "").trim();
    const type = raw.toLowerCase() as WidgetType;
    if (!type || !WIDGET_TYPES.includes(type) || !targetCell.isMergedOrigin) return;
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
    if (targetCell.widget?.type === WIDGET_TYPE_GRID) {
      el?.classList.add(DragDropCssClass.CellDragOver);
      e.dataTransfer!.dropEffect = "copy";
    } else {
      e.dataTransfer!.dropEffect = "none";
    }
    this.layoutDropPreview.set(null);
  }

  private updateLayoutDropPreview(e: DragEvent, targetCell: CanvasCell, el: HTMLElement | undefined): void {
    if (targetCell.widget?.type === WIDGET_TYPE_GRID || !targetCell.isMergedOrigin) return;
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
    const raw = (e.dataTransfer?.getData(DragDropDataKey.WidgetType) || e.dataTransfer?.getData("text/plain") || "").trim();
    const type = raw.toLowerCase() as WidgetType;
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
    const raw = (e.dataTransfer?.getData(DragDropDataKey.WidgetType) || e.dataTransfer?.getData("text/plain") || "").trim();
    const type = raw.toLowerCase();
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

  removeWidget(cellId: string): void {
    this.canvas.removeWidget(cellId);
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
      if (!result) return;
      const state = this.canvas.getStateForSave();
      console.log("[Save layout] state saved to localStorage (tags & nesting, bindings as paths):", state);
      const clone = this.getPreviewClone();
      console.log("[Save layout] clone (same as Download HTML — no toolbar, no table tools):", clone);
      const name = result.name.trim() || DEFAULT_LAYOUT_NAME;
      if (result.layoutId) {
        this.savedLayouts.updateLayout(result.layoutId, state, name);
      } else {
        this.savedLayouts.addLayout(name, state);
      }
      this.cdr.detectChanges();
    });
  }

  /** Handles template dropdown change: New Template, Select Template, or a saved layout. */
  onLayoutSelect(value: string | null): void {
    this.layoutDropdownOverride.set(undefined);
    if (value === LayoutOption.NewLayout) {
      this.openNewLayoutDialog();
      return;
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
      this.layoutDropdownOverride.set(undefined);
      const name = result.name.trim() || DEFAULT_LAYOUT_NAME;
      const state = this.canvas.getInitialLayoutState();
      this.savedLayouts.addLayout(name, state);
      this.canvas.loadState(state);
      this.canvas.clearUndoHistory();
      this.canvas.setSelectedCell(null);
      this.clearSelection();
      this.canvas.clearNestedSelection();
      this.cdr.detectChanges();
    });
  }

  undo(): void {
    this.canvas.undo();
    this.clearSelection();
  }

  /** Returns the cloned form element (builder chrome stripped). Use for preview/export or inspection. */
  getPreviewClone(): HTMLElement | null {
    this.cdr.detectChanges();
    const container = (this.canvasFormRef?.nativeElement ??
      document.body.querySelector("form.canvas-form")) as HTMLElement | null;
    if (!container) return null;
    const clone = container.cloneNode(true) as HTMLElement;
    copyFormValues(container, clone);
    stripBuilderChrome(clone, { stripAngular: true });
    return clone;
  }

  /** Returns HTML string for preview/export: full form element (form tag and all content, builder chrome already stripped). */
  getPreviewHtml(): string {
    const clone = this.getPreviewClone();
    return clone ? clone.outerHTML : "";
  }

  openPreview(): void {
    this.cdr.detectChanges();
    setTimeout(() => {
      const html = this.getPreviewHtml();
      this.dialog.open(PreviewModalComponent, {
        data: { title: "HTML Preview", html },
        width: "90vw",
        maxWidth: "800px",
      });
    }, 0);
  }

  downloadCanvasHtml(): void {
    const html = this.getPreviewHtml();
    if (!html) return;
    const layout = this.savedLayouts.selectedLayout();
    const filename = `${toSafeFilename(layout?.name)}.html`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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

  /** Logs the published HTML (layout + native elements only) to the console. */
  publish(): void {
    const clone = this.getPublishHtml();
    console.log("[Publish] HTML (layout kept, component tags removed):", clone ?? "");
    this.snackBar.open("Form published. HTML has been logged to the console.", undefined, {
      duration: 4000,
    });
  }
}
