import { TestBed } from '@angular/core/testing';
import { EmbeddedTableComponent } from './embedded-table.component';
import type { WidgetInstance } from '../../models/canvas.model';
import { WIDGET_TYPE_TABLE } from '../../models/canvas.model';
import { CanvasService } from '../../../core/services/canvas.service';
import { LayoutGuardService } from '../../../core/services/layout-guard.service';
import { createDefaultNestedTable } from '../../utils/nested-table.util';
import { DragDropDataKey } from '../../constants/drag-drop.constants';
import { LayoutAction, LayoutDropPosition } from '../../enums';

function createMockDragEvent(
  data: Record<string, string> = {},
  types: string[] = []
): DragEvent {
  const dropEffectRef = { value: 'none' };
  const dataTransfer = {
    getData: (key: string) => data[key] ?? '',
    types,
    setData: () => {},
    clearData: () => {},
    get dropEffect() { return dropEffectRef.value; },
    set dropEffect(v: string) { dropEffectRef.value = v; },
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  };
  return {
    preventDefault: () => {},
    stopPropagation: () => {},
    dataTransfer: dataTransfer as unknown as DataTransfer,
    currentTarget: null,
    target: null,
    clientX: 50,
    clientY: 50,
  } as unknown as DragEvent;
}

describe('EmbeddedTableComponent', () => {
  const defaultNested = createDefaultNestedTable();
  const mockCanvas = {
    nestedSelectionPath: () => null,
    nestedSelectionCells: () => [],
    setSelectedNestedCell: jasmine.createSpy(),
    setSelectedOptionIndex: jasmine.createSpy(),
    setNestedSelection: jasmine.createSpy(),
    clearNestedSelection: jasmine.createSpy(),
  };
  const mockLayoutGuard = { hasLayoutNamed: () => true, ensureLayoutNamed: () => Promise.resolve(true) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmbeddedTableComponent],
      providers: [
        { provide: CanvasService, useValue: mockCanvas },
        { provide: LayoutGuardService, useValue: mockLayoutGuard },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('rows returns widget nestedTable rows when present', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBeGreaterThan(0);
  });

  it('layoutDropPreview is null initially', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.layoutDropPreview()).toBeNull();
  });

  it('rows returns default state when widget has no nestedTable', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.rows()[0].cells.length).toBe(3);
  });

  it('columnIndices returns array matching column count', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.columnIndices().length).toBe(defaultNested.rows[0].cells.length);
  });

  it('nestedTableChange emits when emitState is triggered via addRowAt', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    let emitted: unknown = null;
    fixture.componentInstance.nestedTableChange.subscribe((s) => (emitted = s));
    fixture.componentInstance.addRowAt(0);
    expect(emitted).toBeTruthy();
  });

  it('removeRowAt returns false when only one row', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.removeRowAt(0)).toBe(false);
  });

  it('removeRowAt returns true when 2+ rows', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.addRowAt(1);
    expect(fixture.componentInstance.removeRowAt(1)).toBe(true);
    expect(fixture.componentInstance.rows().length).toBe(1);
  });

  it('removeColumnAt returns false when only one column', () => {
    const singleCol = createDefaultNestedTable();
    singleCol.rows[0].cells = [singleCol.rows[0].cells[0]];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: singleCol } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.removeColumnAt(0)).toBe(false);
  });

  it('removeColumnAt returns true and removes column when 2+ columns', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    const initialCols = fixture.componentInstance.rows()[0].cells.length;
    expect(fixture.componentInstance.removeColumnAt(1)).toBe(true);
    expect(fixture.componentInstance.rows()[0].cells.length).toBe(initialCols - 1);
  });

  it('addColumnAt adds column and emits', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    const initialCols = fixture.componentInstance.rows()[0].cells.length;
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    fixture.componentInstance.addColumnAt(1);
    expect(fixture.componentInstance.rows()[0].cells.length).toBe(initialCols + 1);
    expect(emitted).toBe(true);
  });

  it('getSpan returns colSpan and rowSpan for cell', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    const span = fixture.componentInstance.getSpan(0, 0);
    expect(span.colSpan).toBe(1);
    expect(span.rowSpan).toBe(1);
  });

  it('removeNestedWidget removes widget from cell and emits', () => {
    const nestedWithWidget = createDefaultNestedTable();
    const cellId = nestedWithWidget.rows[0].cells[0].id;
    nestedWithWidget.rows[0].cells[0].widgets = [{ id: 'nw1', type: 'label' }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nestedWithWidget } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    fixture.componentInstance.removeNestedWidget(cellId, 'nw1');
    expect(fixture.componentInstance.rows()[0].cells[0].widgets.length).toBe(0);
    expect(emitted).toBe(true);
  });

  it('moveWidgetInNested moves widget from one cell to another', () => {
    const nestedWithTwoCells = createDefaultNestedTable();
    const fromCellId = nestedWithTwoCells.rows[0].cells[0].id;
    const toCellId = nestedWithTwoCells.rows[0].cells[1].id;
    const widget = { id: 'nw1', type: 'label' } as WidgetInstance;
    nestedWithTwoCells.rows[0].cells[0].widgets = [widget];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nestedWithTwoCells } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.moveWidgetInNested(fromCellId, toCellId, widget);
    expect(fixture.componentInstance.rows()[0].cells[0].widgets.length).toBe(0);
    expect(fixture.componentInstance.rows()[0].cells[1].widgets.length).toBe(1);
  });

  it('moveWidgetInNested does nothing when fromCellId equals toCellId', () => {
    const nestedWithWidget = createDefaultNestedTable();
    const cellId = nestedWithWidget.rows[0].cells[0].id;
    const widget = { id: 'nw1', type: 'label' } as WidgetInstance;
    nestedWithWidget.rows[0].cells[0].widgets = [widget];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nestedWithWidget } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.moveWidgetInNested(cellId, cellId, widget);
    expect(fixture.componentInstance.rows()[0].cells[0].widgets.length).toBe(1);
  });

  it('onDrop with NestedMove moves widget to target cell', () => {
    const nested = createDefaultNestedTable();
    const fromId = nested.rows[0].cells[0].id;
    const toCell = nested.rows[0].cells[1];
    const widget = { id: 'nw1', type: 'label' } as WidgetInstance;
    nested.rows[0].cells[0].widgets = [widget];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    const e = createMockDragEvent({ [DragDropDataKey.NestedMove]: JSON.stringify({ fromCellId: fromId, widget }) }, [DragDropDataKey.NestedMove]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, toCell);
    expect(fixture.componentInstance.rows()[0].cells[1].widgets.length).toBe(1);
  });

  it('onDrop with LayoutAction Row adds row and clears preview', () => {
    const nested = createDefaultNestedTable();
    const targetCell = nested.rows[0].cells[0];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.layoutDropPreview.set({ type: LayoutAction.Row, rowIndex: 0, colIndex: 0, position: LayoutDropPosition.After });
    const e = createMockDragEvent({ [DragDropDataKey.LayoutAction]: LayoutAction.Row }, [DragDropDataKey.LayoutActionRow]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, targetCell);
    expect(fixture.componentInstance.rows().length).toBe(2);
    expect(fixture.componentInstance.layoutDropPreview()).toBeNull();
  });

  it('onDrop with widget type adds widget to cell and emits', () => {
    const nested = createDefaultNestedTable();
    const targetCell = nested.rows[0].cells[0];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    const e = createMockDragEvent({ [DragDropDataKey.WidgetType]: 'label' }, [DragDropDataKey.WidgetType]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, targetCell);
    expect(getNestedCellWidgets(fixture.componentInstance.rows()[0].cells[0]).length).toBe(1);
    expect(emitted).toBe(true);
  });

  it('onDragOver sets dropEffect and layoutDropPreview for layout action', () => {
    const nested = createDefaultNestedTable();
    const targetCell = nested.rows[0].cells[0];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    const td = document.createElement('td');
    const e = createMockDragEvent({}, [DragDropDataKey.LayoutActionRow]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = td;
    fixture.componentInstance.onDragOver(e, targetCell);
    expect(e.dataTransfer!.dropEffect).toBe('copy');
    expect(fixture.componentInstance.layoutDropPreview()).not.toBeNull();
    expect(td.classList.contains('embedded-cell-drag-over')).toBe(true);
  });

  it('onDragLeave removes drag-over class', () => {
    const nested = createDefaultNestedTable();
    const targetCell = nested.rows[0].cells[0];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    const td = document.createElement('td');
    td.classList.add('embedded-cell-drag-over');
    const e = createMockDragEvent() as DragEvent & { currentTarget: HTMLElement };
    e.currentTarget = td;
    fixture.componentInstance.onDragLeave(e);
    expect(td.classList.contains('embedded-cell-drag-over')).toBe(false);
  });

  it('onTableDragLeave clears layoutDropPreview when leaving table', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.layoutDropPreview.set({ type: LayoutAction.Row, rowIndex: 0, colIndex: 0, position: LayoutDropPosition.Before });
    const e = createMockDragEvent() as DragEvent & { relatedTarget: Node | null; currentTarget: HTMLElement };
    e.relatedTarget = null;
    e.currentTarget = document.createElement('div');
    fixture.componentInstance.onTableDragLeave(e);
    expect(fixture.componentInstance.layoutDropPreview()).toBeNull();
  });

  it('mergeRange and canMerge reflect selection', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.mergeRange()).toBeNull();
    expect(fixture.componentInstance.canMerge()).toBe(false);
  });

  it('isSelected returns true when cell in selection', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.selectionCells.set(['0,0', '0,1']);
    expect(fixture.componentInstance.isSelected(0, 0)).toBe(true);
    expect(fixture.componentInstance.isSelected(0, 2)).toBe(false);
  });

  it('onCellClick with ctrlKey updates selection and calls setNestedSelection', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.componentRef.setInput('parentCellId', 'pc1');
    fixture.componentRef.setInput('parentWidgetId', 'pw1');
    fixture.detectChanges();
    const cell = fixture.componentInstance.rows()[0].cells[0];
    const e = { stopPropagation: () => {}, ctrlKey: true, target: null } as unknown as MouseEvent;
    fixture.componentInstance.onCellClick(e, 0, 0, cell);
    expect(mockCanvas.setNestedSelection).toHaveBeenCalledWith('pc1', 'pw1', ['0,0']);
  });

  it('onCellClick without ctrlKey clears selection and calls setSelectedNestedCell when parent set', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.componentRef.setInput('parentCellId', 'pc1');
    fixture.componentRef.setInput('parentWidgetId', 'pw1');
    fixture.detectChanges();
    const cell = fixture.componentInstance.rows()[0].cells[0];
    const e = { stopPropagation: () => {}, ctrlKey: false, target: document.createElement('div') } as unknown as MouseEvent;
    fixture.componentInstance.onCellClick(e, 0, 0, cell);
    expect(mockCanvas.clearNestedSelection).toHaveBeenCalled();
    expect(mockCanvas.setSelectedNestedCell).toHaveBeenCalledWith('pc1', 'pw1', cell.id, jasmine.anything());
  });

  it('clearMergeSelection clears selection and canvas nested selection', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.selectionCells.set(['0,0']);
    fixture.componentInstance.clearMergeSelection();
    expect(fixture.componentInstance.selectionCells().length).toBe(0);
    expect(mockCanvas.clearNestedSelection).toHaveBeenCalled();
  });

  it('mergeSelection merges cells when range selected and emits', () => {
    const nested = createDefaultNestedTable();
    nested.rows.push({
      id: 'r1',
      cells: [
        { id: 'c3', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        { id: 'c4', rowIndex: 1, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        { id: 'c5', rowIndex: 1, colIndex: 2, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
      ],
    });
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.selectionCells.set(['0,0', '0,1']);
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    fixture.componentInstance.mergeSelection();
    expect(fixture.componentInstance.rows()[0].cells[0].colSpan).toBe(2);
    expect(emitted).toBe(true);
  });

  it('unmergeAt unmerges cell and clears selection', () => {
    const nested = createDefaultNestedTable();
    const origin = nested.rows[0].cells[0];
    origin.colSpan = 2;
    origin.isMergedOrigin = true;
    nested.rows[0].cells = [
      origin,
      {
        id: 'c1b',
        rowIndex: 0,
        colIndex: 1,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: false,
      },
    ];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.selectionCells.set(['0,0']);
    fixture.componentInstance.unmergeAt(0, 0);
    expect(fixture.componentInstance.rows()[0].cells[0].colSpan).toBe(1);
    expect(fixture.componentInstance.selectionCells().length).toBe(0);
  });

  it('isMergedCell returns true when span > 1', () => {
    const nested = createDefaultNestedTable();
    nested.rows[0].cells[0].colSpan = 2;
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.isMergedCell(0, 0)).toBe(true);
  });

  it('shouldSkipCell returns true for covered cell in merge', () => {
    const nested = createDefaultNestedTable();
    nested.rows[0].cells[0].colSpan = 2;
    nested.rows[0].cells = [
      nested.rows[0].cells[0],
      {
        id: 'c1b',
        rowIndex: 0,
        colIndex: 1,
        widgets: [],
        colSpan: 1,
        rowSpan: 1,
        isMergedOrigin: false,
      },
    ];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.shouldSkipCell(0, 1)).toBe(true);
  });

  it('onCellWidgetLabelChange updates label and emits', () => {
    const nested = createDefaultNestedTable();
    const cellId = nested.rows[0].cells[0].id;
    nested.rows[0].cells[0].widgets = [{ id: 'nw1', type: 'label', label: 'Old' }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    fixture.componentInstance.onCellWidgetLabelChange(cellId, 'nw1', 'New Label');
    expect(getNestedCellWidgets(fixture.componentInstance.rows()[0].cells[0])[0].label).toBe('New Label');
    expect(emitted).toBe(true);
  });

  it('onCellOptionSelect calls setSelectedNestedCell and setSelectedOptionIndex', () => {
    const nested = createDefaultNestedTable();
    const cell = nested.rows[0].cells[0];
    cell.widgets = [{ id: 'nw1', type: 'radio', options: ['A', 'B'] }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.componentRef.setInput('parentCellId', 'pc1');
    fixture.componentRef.setInput('parentWidgetId', 'pw1');
    fixture.detectChanges();
    fixture.componentInstance.onCellOptionSelect(cell, cell.widgets[0], 1);
    expect(mockCanvas.setSelectedNestedCell).toHaveBeenCalledWith('pc1', 'pw1', cell.id, jasmine.anything());
    expect(mockCanvas.setSelectedOptionIndex).toHaveBeenCalledWith(1);
  });

  it('onCellWidgetOptionsChange updates options and emits', () => {
    const nested = createDefaultNestedTable();
    const cellId = nested.rows[0].cells[0].id;
    nested.rows[0].cells[0].widgets = [{ id: 'nw1', type: 'radio', options: ['A'] }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.onCellWidgetOptionsChange(cellId, 'nw1', ['X', 'Y']);
    expect(getNestedCellWidgets(fixture.componentInstance.rows()[0].cells[0])[0].options).toEqual(['X', 'Y']);
  });

  it('onCellNestedTableChange updates nestedTable and emits', () => {
    const nested = createDefaultNestedTable();
    const cellId = nested.rows[0].cells[0].id;
    const innerState = createDefaultNestedTable('inner');
    nested.rows[0].cells[0].widgets = [{ id: 'nw1', type: 'table', nestedTable: createDefaultNestedTable() }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    fixture.componentInstance.onCellNestedTableChange(cellId, 'nw1', innerState);
    const w = getNestedCellWidgets(fixture.componentInstance.rows()[0].cells[0])[0];
    expect((w as WidgetInstance & { nestedTable: unknown }).nestedTable).toEqual(innerState);
  });

  it('removeRowAt returns false for invalid index', () => {
    const nested = createDefaultNestedTable();
    nested.rows.push({
      id: 'r1',
      cells: nested.rows[0].cells.map((c, ci) => ({ ...c, id: c.id + '_2', rowIndex: 1, colIndex: ci })),
    });
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.removeRowAt(-1)).toBe(false);
    expect(fixture.componentInstance.removeRowAt(10)).toBe(false);
  });

  it('removeColumnAt returns false for invalid index', () => {
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: defaultNested } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.removeColumnAt(-1)).toBe(false);
    expect(fixture.componentInstance.removeColumnAt(10)).toBe(false);
  });

  it('nestedCellWidgets returns widgets from cell', () => {
    const nested = createDefaultNestedTable();
    nested.rows[0].cells[0].widgets = [{ id: 'nw1', type: 'label' }];
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: nested } as WidgetInstance);
    fixture.detectChanges();
    const cell = fixture.componentInstance.rows()[0].cells[0];
    expect(fixture.componentInstance.nestedCellWidgets(cell).length).toBe(1);
  });

  it('getSpan returns 1,1 when no rows', () => {
    const emptyNested = { rows: [] };
    const fixture = TestBed.createComponent(EmbeddedTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: emptyNested } as WidgetInstance);
    fixture.detectChanges();
    const span = fixture.componentInstance.getSpan(0, 0);
    expect(span.colSpan).toBe(1);
    expect(span.rowSpan).toBe(1);
  });
});

function getNestedCellWidgets(cell: { widgets?: WidgetInstance[]; widget?: WidgetInstance | null }): WidgetInstance[] {
  if (Array.isArray(cell.widgets)) return cell.widgets;
  return cell.widget != null ? [cell.widget] : [];
}
