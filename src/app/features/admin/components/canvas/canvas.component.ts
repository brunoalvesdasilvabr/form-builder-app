import { Component, inject, signal, computed, ChangeDetectorRef } from "@angular/core";
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
import { WIDGET_TYPES } from "../../../../shared/models/canvas.model";
import {
  computeMergeRange,
  canMergeFromRange,
  updateSelectionForCtrlClick,
} from "../../../../shared/utils/grid-selection.util";
import { getElementKeyFromElement } from "../../../../shared/utils/element-target.util";
import { FormLayoutNameDirective } from "../../../../shared/directives/form-layout-name.directive";
import { toSafeFilename } from "../../../../shared/utils/safe-filename.util";

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

  readonly selectionCells = signal<string[]>([]); // "row,col" keys, merge only if they form a rectangle

  readonly mergeRange = computed(() => computeMergeRange(this.selectionCells()));
  readonly canMerge = computed(() => canMergeFromRange(this.mergeRange()));

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().includes(`${rowIndex},${colIndex}`);
  }

  // ctrl+click = add/remove from selection (no unmerge). no ctrl = clear or open right panel
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number, cell: CanvasCell): void {
    if (e.ctrlKey) {
      this.selectionCells.set(updateSelectionForCtrlClick(this.selectionCells(), rowIndex, colIndex));
    } else {
      if (cell.widget && cell.widget.type === "table") {
        this.canvas.setSelectedCell(null);
      } else {
        const hasFormControl = cell.widget && ["input", "checkbox", "radio"].includes(cell.widget.type);
        const doSelect = () => {
          const el = e.target as Element;
          const elementTarget = getElementKeyFromElement(el);
          if (elementTarget) {
            this.canvas.setSelectedCell(cell.id, "element", elementTarget);
          } else if (
            el?.closest?.("app-widget-input") ||
            el?.closest?.("app-widget-checkbox") ||
            el?.closest?.("app-widget-radio") ||
            el?.closest?.("app-widget-label") ||
            el?.closest?.("app-widget-table") ||
            el?.closest?.("app-widget-grid")
          ) {
            this.canvas.setSelectedCell(cell.id, "widget-inner");
          } else if (el?.closest?.("app-widget-renderer")) {
            this.canvas.setSelectedCell(cell.id, "widget");
          } else {
            this.canvas.setSelectedCell(cell.id, "cell");
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
      this.clearSelection();
    }
  }

  /** When cell is a grid: set selectedGridColumnIndex from header click, or null for grid-level. */
  private setGridColumnSelection(cell: CanvasCell, e: MouseEvent): void {
    if (cell.widget?.type !== 'grid') return;
    const th = (e.target as Element).closest('th[mat-header-cell]');
    if (th) {
      const tr = th.closest('tr');
      const idx = tr ? Array.from(tr.children).indexOf(th) : -1;
      this.canvas.setSelectedGridColumnIndex(idx >= 0 ? idx : null);
    } else {
      this.canvas.setSelectedGridColumnIndex(null);
    }
  }

  clearSelection(): void {
    this.selectionCells.set([]);
  }

  readonly canRemoveRow = computed(() => (this.canvas.rows()?.length ?? 0) > 1);
  readonly canRemoveColumn = computed(() => (this.canvas.rows()[0]?.cells.length ?? 0) > 1);

  addRow(): void {
    this.canvas.addRow();
    this.clearSelection();
  }

  addColumn(): void {
    this.canvas.addColumn();
    this.clearSelection();
  }

  removeRow(): void {
    this.canvas.removeRow();
    this.clearSelection();
  }

  removeColumn(): void {
    this.canvas.removeColumn();
    this.clearSelection();
  }

  mergeSelection(): void {
    const range = this.mergeRange();
    if (!range || !this.canMerge()) return;
    const { r0, r1, c0, c1 } = range;
    this.canvas.mergeCells(r0, c0, r1, c1);
    this.clearSelection();
  }

  hasSelection(): boolean {
    return this.selectionCells().length > 0;
  }

  onDrop(e: DragEvent, targetCell: CanvasCell): void {
    e.preventDefault();
    e.stopPropagation();
    const moveData = e.dataTransfer?.getData("application/x-canvas-move");
    if (moveData) {
      try {
        const { fromCellId, widget } = JSON.parse(moveData) as { fromCellId: string; widget: WidgetInstance };
        if (!targetCell.isMergedOrigin || !widget) return;
        this.canvas.moveWidget(fromCellId, targetCell.id, widget);
      } catch {
        // bad payload, skip
      }
      (e.currentTarget as HTMLElement)?.classList.remove("canvas-cell-drag-over");
      return;
    }
    const raw = (
      e.dataTransfer?.getData("application/widget-type") ||
      e.dataTransfer?.getData("text/plain") ||
      ""
    ).trim();
    const type = raw.toLowerCase() as WidgetType;
    if (!type || !WIDGET_TYPES.includes(type)) return;
    if (!targetCell.isMergedOrigin) return;
    this.canvas.setWidgetAt(targetCell.rowIndex, targetCell.colIndex, type);
    (e.currentTarget as HTMLElement)?.classList.remove("canvas-cell-drag-over");
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    const moveData = e.dataTransfer?.types.includes("application/x-canvas-move");
    e.dataTransfer!.dropEffect = moveData ? "move" : "copy";
    (e.currentTarget as HTMLElement)?.classList.add("canvas-cell-drag-over");
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement)?.classList.remove("canvas-cell-drag-over");
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
      const state = this.canvas.getState();
      console.log("[Save layout] state saved to localStorage (tags & nesting):", state);
      const clone = this.getPreviewClone();
      console.log("[Save layout] clone (same as Download HTML — no toolbar, no table tools):", clone);
      const name = result.name.trim() || "Untitled";
      if (result.layoutId) {
        this.savedLayouts.updateLayout(result.layoutId, state, name);
      } else {
        this.savedLayouts.addLayout(name, state);
      }
      this.cdr.detectChanges();
    });
  }

  onLayoutSelect(layoutId: string | null): void {
    this.savedLayouts.selectLayout(layoutId);
    this.canvas.clearUndoHistory();
    if (layoutId) {
      const layout = this.savedLayouts.getLayoutById(layoutId);
      if (layout) {
        this.canvas.loadState(layout.state);
      }
    } else {
      this.canvas.loadState(this.canvas.getDefaultState());
    }
  }

  undo(): void {
    this.canvas.undo();
    this.clearSelection();
  }

  /** Returns the cloned form element (builder chrome stripped). Use for preview/export or inspection. */
  getPreviewClone(): HTMLElement | null {
    const container = document.body.querySelector("form.canvas-form") as HTMLElement | null;
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
    const html = this.getPreviewHtml();
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
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Returns HTML with same layout but all component tags stripped (only inputs, checkboxes, labels, etc.). */
  getPublishHtml(): string {
    const container = document.body.querySelector("form.canvas-form") as HTMLElement | null;
    if (!container) return "";
    const clone = container.cloneNode(true) as HTMLElement;
    copyFormValues(container, clone);
    stripBuilderChrome(clone, { stripAngular: true });
    stripComponentWrappers(clone);
    return clone.outerHTML;
  }

  /** Logs the published HTML (layout + native elements only) to the console. */
  publish(): void {
    const html = this.getPublishHtml();
    console.log("[Publish] HTML (layout kept, component tags removed):", html);
    this.snackBar.open("Form published. HTML (layout only, no component tags) has been logged to the console.", undefined, {
      duration: 4000,
    });
  }
}
