import { Component, inject, signal, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../../core/services/canvas.service';
import { WidgetRendererComponent } from '../../../../shared/components/widget-renderer/widget-renderer.component';
import type { CanvasCell, WidgetType, NestedTableState, WidgetInstance } from '../../../../shared/models/canvas.model';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, WidgetRendererComponent],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
})
export class CanvasComponent {
  private readonly canvas = inject(CanvasService);

  private readonly canvasAreaRef = viewChild<ElementRef<HTMLElement>>('canvasArea');

  readonly rows = this.canvas.rows;

  /** For merge: first selected cell (rowIndex, colIndex). */
  readonly selectionStart = signal<{ row: number; col: number } | null>(null);
  /** For merge: second selected cell. */
  readonly selectionEnd = signal<{ row: number; col: number } | null>(null);

  readonly mergeRange = computed(() => {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return null;
    const r0 = Math.min(start.row, end.row);
    const r1 = Math.max(start.row, end.row);
    const c0 = Math.min(start.col, end.col);
    const c1 = Math.max(start.col, end.col);
    return { r0, r1, c0, c1 };
  });

  readonly canMerge = computed(() => {
    const range = this.mergeRange();
    if (!range) return false;
    const { r0, r1, c0, c1 } = range;
    return r0 < r1 || c0 < c1;
  });

  /** Set of 'row,col' for the current selection range (reactive). */
  readonly selectedCells = computed(() => {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start) return new Set<string>();
    if (!end) return new Set([`${start.row},${start.col}`]);
    const r0 = Math.min(start.row, end.row);
    const r1 = Math.max(start.row, end.row);
    const c0 = Math.min(start.col, end.col);
    const c1 = Math.max(start.col, end.col);
    const set = new Set<string>();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) set.add(`${r},${c}`);
    }
    return set;
  });

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectedCells().has(`${rowIndex},${colIndex}`);
  }

  onCellClick(rowIndex: number, colIndex: number): void {
    const start = this.selectionStart();
    if (!start) {
      this.selectionStart.set({ row: rowIndex, col: colIndex });
      this.selectionEnd.set(null);
      return;
    }
    if (start.row === rowIndex && start.col === colIndex) {
      this.clearSelection();
      return;
    }
    this.selectionEnd.set({ row: rowIndex, col: colIndex });
  }

  clearSelection(): void {
    this.selectionStart.set(null);
    this.selectionEnd.set(null);
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

  unmergeAt(rowIndex: number, colIndex: number): void {
    this.canvas.unmergeCell(rowIndex, colIndex);
    this.clearSelection();
  }

  onDrop(e: DragEvent, targetCell: CanvasCell): void {
    e.preventDefault();
    e.stopPropagation();
    const moveData = e.dataTransfer?.getData('application/x-canvas-move');
    if (moveData) {
      try {
        const { fromCellId, widget } = JSON.parse(moveData) as { fromCellId: string; widget: WidgetInstance };
        if (!targetCell.isMergedOrigin || !widget) return;
        this.canvas.moveWidget(fromCellId, targetCell.id, widget);
      } catch {
        // ignore invalid move data
      }
      (e.currentTarget as HTMLElement)?.classList.remove('canvas-cell-drag-over');
      return;
    }
    const raw = (e.dataTransfer?.getData('application/widget-type') || e.dataTransfer?.getData('text/plain') || '').trim();
    const type = raw.toLowerCase() as WidgetType;
    if (!type || !['input', 'checkbox', 'radio', 'table', 'label'].includes(type)) return;
    if (!targetCell.isMergedOrigin) return;
    this.canvas.setWidgetAt(targetCell.rowIndex, targetCell.colIndex, type);
    (e.currentTarget as HTMLElement)?.classList.remove('canvas-cell-drag-over');
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    const moveData = e.dataTransfer?.types.includes('application/x-canvas-move');
    e.dataTransfer!.dropEffect = moveData ? 'move' : 'copy';
    (e.currentTarget as HTMLElement)?.classList.add('canvas-cell-drag-over');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement)?.classList.remove('canvas-cell-drag-over');
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

  onCellContextMenu(e: MouseEvent, rowIndex: number, colIndex: number): void {
    if (!this.isMergedCell(rowIndex, colIndex)) return;
    e.preventDefault();
    this.unmergeAt(rowIndex, colIndex);
  }

  saveLayout(): void {
    const el = this.canvasAreaRef()?.nativeElement;
    if (el) {
      console.log(el.innerHTML);
    }
  }
}
