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

  readonly selectionCells = signal<Set<string>>(new Set()); // "row,col" keys, merge only if they form a rectangle

  readonly mergeRange = computed(() => {
    const set = this.selectionCells();
    if (set.size === 0) return null;
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    set.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    });
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!set.has(`${r},${c}`)) return null;
      }
    }
    return { r0: minR, r1: maxR, c0: minC, c1: maxC };
  });

  readonly canMerge = computed(() => {
    const range = this.mergeRange();
    if (!range) return false;
    const { r0, r1, c0, c1 } = range;
    return r0 < r1 || c0 < c1;
  });

  isSelected(rowIndex: number, colIndex: number): boolean {
    return this.selectionCells().has(`${rowIndex},${colIndex}`);
  }

  // ctrl+click = add/remove from selection (or fill rect if 1 cell selected). no ctrl = clear. unmerge = right-click merged cell
  onCellClick(e: MouseEvent, rowIndex: number, colIndex: number): void {
    if (e.ctrlKey) {
      const key = `${rowIndex},${colIndex}`;
      const set = this.selectionCells();
      if (set.has(key)) {
        const next = new Set(set);
        next.delete(key);
        this.selectionCells.set(next);
        return;
      }
      if (set.size === 0) {
        this.selectionCells.set(new Set([key]));
        return;
      }
      if (set.size === 1) {
        const [first] = set;
        const [r0, c0] = first.split(',').map(Number);
        const r1 = rowIndex, c1 = colIndex;
        const loR = Math.min(r0, r1), hiR = Math.max(r0, r1), loC = Math.min(c0, c1), hiC = Math.max(c0, c1);
        const rect = new Set<string>();
        for (let r = loR; r <= hiR; r++) for (let c = loC; c <= hiC; c++) rect.add(`${r},${c}`);
        this.selectionCells.set(rect);
        return;
      }
      const next = new Set(set);
      next.add(key);
      this.selectionCells.set(next);
    } else {
      this.clearSelection();
    }
  }

  clearSelection(): void {
    this.selectionCells.set(new Set());
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
    return this.selectionCells().size > 0;
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
        // bad payload, skip
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
