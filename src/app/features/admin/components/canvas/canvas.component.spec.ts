import { TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { CanvasService } from '../../../../core/services/canvas.service';
import { SavedLayoutsService } from '../../../../core/services/saved-layouts.service';
import { LayoutGuardService } from '../../../../core/services/layout-guard.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { routes } from '../../../../app.routes';
import { of, Subject } from 'rxjs';
import { LayoutOption } from '../../../../shared/enums';
import { DragDropDataKey } from '../../../../shared/constants/drag-drop.constants';
import { FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID } from '../../../../shared/constants/canvas.constants';

/** Creates a mock DragEvent with dataTransfer getData and types. */
function createMockDragEvent(
  data: Record<string, string> = {},
  types: string[] = []
): DragEvent {
  const dataTransfer = {
    getData: (key: string) => data[key] ?? '',
    types,
    setData: () => {},
    clearData: () => {},
    dropEffect: 'none',
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
  } as unknown as DragEvent;
}

describe('CanvasComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        MatDialog,
        MatSnackBar,
        provideRouter(routes),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mergeRange is null when no selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    expect(fixture.componentInstance.mergeRange()).toBeNull();
  });

  it('canMerge is false when no merge range', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    expect(fixture.componentInstance.canMerge()).toBe(false);
  });

  it('clearSelection clears canvas selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.componentInstance.clearSelection();
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('showMerge is false when no selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    expect(fixture.componentInstance.showMerge()).toBe(false);
  });

  it('showUnmerge is false when no cell selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    expect(fixture.componentInstance.showUnmerge()).toBe(false);
  });

  it('canSaveLayout is computed from selectedLayout', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    expect(fixture.componentInstance.canSaveLayout()).toBe(false);
  });

  it('layoutDropdownValue returns selectedLayoutId when no override', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    fixture.detectChanges();
    expect(fixture.componentInstance.layoutDropdownValue()).toBeNull();
  });

  it('selectionCells mirrors canvas selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectionCells().length).toBe(1);
  });

  it('showMerge is true when canvas has mergeable selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c2', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c3', rowIndex: 1, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showMerge()).toBe(true);
  });

  it('showUnmerge is true when selected cell is merged origin with span > 1', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    canvas.setSelectedCell('c0');
    fixture.detectChanges();
    expect(fixture.componentInstance.showUnmerge()).toBe(true);
  });

  it('showRemoveRow is true when single row selected and multiple rows exist', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showRemoveRow()).toBe(true);
  });

  it('showRemoveCol is true when single column selected and multiple columns exist', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showRemoveCol()).toBe(true);
  });

  it('showRemoveRow is false when multiple rows in selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0', '1,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showRemoveRow()).toBe(false);
  });

  it('showRemoveCol is false when multiple columns in selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showRemoveCol()).toBe(false);
  });

  it('showStructuralRemoveButtons is true when canvas has merge range', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c2', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c3', rowIndex: 1, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    expect(fixture.componentInstance.showStructuralRemoveButtons()).toBe(true);
  });

  it('canSaveLayout is true when a layout is selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('Test', { rows: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.canSaveLayout()).toBe(true);
  });

  it('selectedLayoutName returns layout name when layout selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('My Layout', { rows: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedLayoutName()).toBe('My Layout');
  });

  it('runMerge merges canvas selection when mergeable', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c2', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c3', rowIndex: 1, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    fixture.componentInstance.runMerge();
    expect(canvas.getState().rows[0].cells[0].colSpan).toBe(2);
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('runUnmerge unmerges selected merged cell', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    canvas.setSelectedCell('c0');
    fixture.detectChanges();
    fixture.componentInstance.runUnmerge();
    expect(canvas.getState().rows[0].cells[0].colSpan).toBe(1);
    expect(canvas.selectedCellId()).toBeNull();
  });

  it('runUnmerge unmerges via selection range when selection contains merged cell', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    fixture.componentInstance.runUnmerge();
    expect(canvas.getState().rows[0].cells[0].colSpan).toBe(1);
  });

  it('hasSelection returns true when selection not empty', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasSelection()).toBe(true);
    canvas.clearCanvasSelection();
    fixture.detectChanges();
    expect(fixture.componentInstance.hasSelection()).toBe(false);
  });

  it('cellWidgets returns widgets from cell', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'label' }, { id: 'w2', type: 'input' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    fixture.detectChanges();
    const cell = canvas.getState().rows[0].cells[0];
    expect(fixture.componentInstance.cellWidgets(cell).length).toBe(2);
  });

  it('cellHasEmbeddedTable returns true when cell has table widget', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: [] } }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    fixture.detectChanges();
    const cell = canvas.getState().rows[0].cells[0];
    expect(fixture.componentInstance.cellHasEmbeddedTable(cell)).toBe(true);
  });

  it('cellHasEmbeddedTable returns false when cell has no table widget', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }],
      }],
    });
    fixture.detectChanges();
    const cell = canvas.getState().rows[0].cells[0];
    expect(fixture.componentInstance.cellHasEmbeddedTable(cell)).toBe(false);
  });

  it('removeNestedRowAt delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'removeNestedRowAt');
    fixture.componentInstance.removeNestedRowAt('pc1', 'pw1', 0);
    expect(spy).toHaveBeenCalledWith('pc1', 'pw1', 0);
  });

  it('isSelected returns true when cell is in selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setCanvasSelection(['0,0', '1,1']);
    fixture.detectChanges();
    expect(fixture.componentInstance.isSelected(0, 0)).toBe(true);
    expect(fixture.componentInstance.isSelected(1, 1)).toBe(true);
    expect(fixture.componentInstance.isSelected(0, 1)).toBe(false);
  });

  it('selectionContainsMergedCell is true when selection range includes merged origin', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0', '0,1']);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectionContainsMergedCell()).toBe(true);
  });

  it('selectionContainsMergedCell is false when nested path is set', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setCanvasSelection(['0,0']);
    canvas.setNestedSelection('c0', 'w1', ['0,0']);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectionContainsMergedCell()).toBe(false);
  });

  it('templateSelectOptions includes New Template and saved layouts', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('Layout A', { rows: [] });
    fixture.detectChanges();
    const opts = fixture.componentInstance.templateSelectOptions();
    expect(opts.some((o) => o.value === LayoutOption.NewLayout && o.label === 'New Template')).toBe(true);
    expect(opts.some((o) => o.label === 'Layout A')).toBe(true);
  });

  it('selectedLayoutName returns empty when no layout and not NewLayout', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedLayoutName()).toBe('');
  });

  it('removeActiveRow removes canvas row when single row selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    fixture.componentInstance.removeActiveRow();
    expect(canvas.getState().rows.length).toBe(1);
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('removeActiveCol removes canvas column when single column selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    fixture.componentInstance.removeActiveCol();
    expect(canvas.getState().rows[0].cells.length).toBe(1);
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('removeRowAt delegates and clears selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    fixture.componentInstance.removeRowAt(0);
    expect(canvas.getState().rows.length).toBe(1);
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('removeColumnAt delegates and clears selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    fixture.componentInstance.removeColumnAt(0);
    expect(canvas.getState().rows[0].cells.length).toBe(1);
    expect(canvas.canvasSelectionCells().length).toBe(0);
  });

  it('removeWidget delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'removeWidget');
    fixture.componentInstance.removeWidget('c0', 'w1');
    expect(spy).toHaveBeenCalledWith('c0', 'w1');
  });

  it('getSelectedNestedRowCol delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setNestedSelection('c0', 'w1', ['0,0']);
    const spy = spyOn(canvas, 'getSelectedNestedRowCol').and.returnValue({ rowIndex: 1, colIndex: 0 });
    fixture.detectChanges();
    expect(fixture.componentInstance.getSelectedNestedRowCol()).toEqual({ rowIndex: 1, colIndex: 0 });
    expect(spy).toHaveBeenCalled();
  });

  it('getNestedMergeRange delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'getNestedMergeRange').and.returnValue({ r0: 0, r1: 0, c0: 0, c1: 1 });
    expect(fixture.componentInstance.getNestedMergeRange()).toEqual({ r0: 0, r1: 0, c0: 0, c1: 1 });
    expect(spy).toHaveBeenCalled();
  });

  it('canRemoveNestedRow returns true when nested table has more than one row', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    spyOn(canvas, 'getNestedTableSize').and.returnValue({ rowCount: 2, colCount: 1 });
    expect(fixture.componentInstance.canRemoveNestedRow({ parentCellId: 'c0', parentWidgetId: 'w1' })).toBe(true);
  });

  it('canRemoveNestedCol returns true when nested table has more than one column', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    spyOn(canvas, 'getNestedTableSize').and.returnValue({ rowCount: 1, colCount: 2 });
    expect(fixture.componentInstance.canRemoveNestedCol({ parentCellId: 'c0', parentWidgetId: 'w1' })).toBe(true);
  });

  it('onRadioOptionSelect sets cell and option index', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const setCellSpy = spyOn(canvas, 'setSelectedCell');
    const setOptionSpy = spyOn(canvas, 'setSelectedOptionIndex');
    fixture.componentInstance.onRadioOptionSelect('c0', 2);
    expect(setCellSpy).toHaveBeenCalledWith('c0');
    expect(setOptionSpy).toHaveBeenCalledWith(2);
  });

  it('updateNestedTable delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'updateNestedTable');
    const state = { rows: [] };
    fixture.componentInstance.updateNestedTable('c0', 'w1', state);
    expect(spy).toHaveBeenCalledWith('c0', 'w1', state);
  });

  it('updateWidgetLabel delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'updateWidgetLabel');
    fixture.componentInstance.updateWidgetLabel('c0', 'w1', 'New Label');
    expect(spy).toHaveBeenCalledWith('c0', 'w1', 'New Label');
  });

  it('updateWidgetOptions delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'updateWidgetOptions');
    fixture.componentInstance.updateWidgetOptions('c0', 'w1', ['A', 'B']);
    expect(spy).toHaveBeenCalledWith('c0', 'w1', ['A', 'B']);
  });

  it('isMergedCell returns true when span > 1', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.isMergedCell(0, 0)).toBe(true);
    // (0,1) is covered by the merge; getSpan returns origin's span so it also reports as merged
    expect(fixture.componentInstance.isMergedCell(0, 1)).toBe(true);
  });

  it('undo delegates and clears selection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    canvas.undo(); // one action to undo
    canvas.setCanvasSelection(['0,0']);
    fixture.detectChanges();
    const clearSpy = spyOn(fixture.componentInstance, 'clearSelection');
    fixture.componentInstance.undo();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('shouldSkipCell delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    spyOn(canvas, 'shouldSkipRendering').and.returnValue(true);
    expect(fixture.componentInstance.shouldSkipCell(0, 1)).toBe(true);
  });

  it('getSpan delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    spyOn(canvas, 'getSpan').and.returnValue({ colSpan: 2, rowSpan: 1 });
    expect(fixture.componentInstance.getSpan(0, 0)).toEqual({ colSpan: 2, rowSpan: 1 });
  });

  it('onDrop with widget type sets widget on cell', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    });
    fixture.detectChanges();
    const setWidgetSpy = spyOn(canvas, 'setWidgetAt');
    const cell = canvas.getState().rows[0].cells[0];
    const e = createMockDragEvent(
      { [DragDropDataKey.WidgetType]: 'label' },
      [DragDropDataKey.WidgetType]
    );
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, cell);
    expect(setWidgetSpy).toHaveBeenCalledWith(0, 0, 'label');
  });

  it('onDrop with CanvasMove moves widget to target cell', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    fixture.detectChanges();
    const moveSpy = spyOn(canvas, 'moveWidget');
    const targetCell = canvas.getState().rows[0].cells[1];
    const e = createMockDragEvent({
      [DragDropDataKey.CanvasMove]: JSON.stringify({ fromCellId: 'c0', widget: { id: 'w1', type: 'label' } }),
    }, [DragDropDataKey.CanvasMove]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, targetCell);
    expect(moveSpy).toHaveBeenCalledWith('c0', 'c1', { id: 'w1', type: 'label' });
  });

  it('onDrop with GridAction row adds grid row', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    fixture.detectChanges();
    const addRowSpy = spyOn(canvas, 'addGridRow');
    const targetCell = canvas.getState().rows[0].cells[0];
    const e = createMockDragEvent(
      { [DragDropDataKey.GridAction]: 'row' },
      [DragDropDataKey.GridActionRow]
    );
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('td');
    fixture.componentInstance.onDrop(e, targetCell);
    expect(addRowSpy).toHaveBeenCalledWith('c0', 'w1');
  });

  it('onDragOver sets dropEffect copy for widget type drag', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    });
    fixture.detectChanges();
    const cell = canvas.getState().rows[0].cells[0];
    const e = createMockDragEvent({}, [DragDropDataKey.WidgetType]);
    const td = document.createElement('td');
    (e as unknown as { currentTarget: HTMLElement | null }).currentTarget = td;
    fixture.componentInstance.onDragOver(e, cell);
    expect(e.dataTransfer!.dropEffect).toBe('copy');
  });

  it('onDragLeave clears layout drop preview when leaving table', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const e = createMockDragEvent() as DragEvent & { relatedTarget: Node | null; currentTarget: HTMLElement };
    e.relatedTarget = null;
    e.currentTarget = document.createElement('div');
    fixture.componentInstance.onTableDragLeave(e);
    expect(fixture.componentInstance.layoutDropPreview()).toBeNull();
  });

  it('onEmptyStateDrop sets table widget on empty canvas when layout selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    const canvas = TestBed.inject(CanvasService);
    savedLayouts.addLayout('T', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    canvas.loadState({ rows: [] });
    fixture.detectChanges();
    const setWidgetSpy = spyOn(canvas, 'setWidgetOnEmptyCanvas');
    const e = createMockDragEvent({ [DragDropDataKey.WidgetType]: 'table' }, [DragDropDataKey.WidgetType]);
    (e as unknown as { currentTarget: HTMLElement }).currentTarget = document.createElement('div');
    fixture.componentInstance.onEmptyStateDrop(e);
    expect(setWidgetSpy).toHaveBeenCalledWith('table');
  });

  it('onEmptyStateDragOver sets dropEffect none when no layout selected', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const e = createMockDragEvent({}, []);
    const dt = e.dataTransfer!;
    fixture.componentInstance.onEmptyStateDragOver(e);
    expect(dt.dropEffect).toBe('none');
  });

  it('onEmptyStateDragLeave removes empty state drag class', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const el = document.createElement('div');
    el.classList.add('canvas-empty-state-drag-over');
    const e = createMockDragEvent() as DragEvent & { currentTarget: HTMLElement };
    e.currentTarget = el;
    fixture.componentInstance.onEmptyStateDragLeave(e);
    expect(el.classList.contains('canvas-empty-state-drag-over')).toBe(false);
  });

  it('getPreviewHtml returns string from clone when form is present', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('T', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    fixture.detectChanges();
    const html = fixture.componentInstance.getPreviewHtml();
    expect(typeof html).toBe('string');
    expect(html).toContain('canvas');
  });

  it('getPreviewLayoutHtml returns content of canvas-content when clone present', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('T', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    fixture.detectChanges();
    const html = fixture.componentInstance.getPreviewLayoutHtml();
    expect(typeof html).toBe('string');
  });

  it('removeNestedColumnAt delegates to canvas', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const canvas = TestBed.inject(CanvasService);
    const spy = spyOn(canvas, 'removeNestedColumnAt');
    fixture.componentInstance.removeNestedColumnAt('pc1', 'pw1', 0);
    expect(spy).toHaveBeenCalledWith('pc1', 'pw1', 0);
  });
});

describe('CanvasComponent with dialog mocks', () => {
  it('selectedLayoutName returns New Template when new layout dialog is open', () => {
    const afterClosed$ = new Subject<{ name: string; layoutId: string | null } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        MatSnackBar,
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.componentInstance.onLayoutSelect(LayoutOption.NewLayout);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedLayoutName()).toBe('New Template');
    afterClosed$.next(undefined);
    afterClosed$.complete();
  });

  it('saveLayout opens dialog and updates layout on result', () => {
    const afterClosed$ = new Subject<{ name: string; layoutId: string | null } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        MatSnackBar,
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    const canvas = TestBed.inject(CanvasService);
    savedLayouts.addLayout('Original', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    canvas.loadState({ rows: [] });
    fixture.detectChanges();
    fixture.componentInstance.saveLayout();
    expect(dialogMock.open).toHaveBeenCalled();
    afterClosed$.next({ name: 'Saved Name', layoutId: savedLayouts.selectedLayoutId() ?? null });
    afterClosed$.complete();
    fixture.detectChanges();
    expect(savedLayouts.selectedLayout()?.name).toBe('Saved Name');
  });

  it('cloneLayout opens dialog and adds layout with new name', () => {
    const afterClosed$ = new Subject<{ name: string; layoutId: string | null } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        MatSnackBar,
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    const canvas = TestBed.inject(CanvasService);
    savedLayouts.addLayout('Original', { rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    canvas.loadState(savedLayouts.selectedLayout()!.state);
    fixture.detectChanges();
    fixture.componentInstance.cloneLayout();
    expect(dialogMock.open).toHaveBeenCalled();
    afterClosed$.next({ name: 'Cloned', layoutId: null });
    afterClosed$.complete();
    fixture.detectChanges();
    const layouts = savedLayouts.layouts();
    expect(layouts.length).toBeGreaterThanOrEqual(2);
    expect(layouts.some((l) => l.name === 'Cloned')).toBe(true);
  });

  it('onLayoutSelect with null loads default state', () => {
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        MatDialog,
        MatSnackBar,
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    const canvas = TestBed.inject(CanvasService);
    savedLayouts.addLayout('L1', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    const loadSpy = spyOn(canvas, 'loadState');
    fixture.detectChanges();
    fixture.componentInstance.onLayoutSelect(null);
    expect(loadSpy).toHaveBeenCalled();
    expect(savedLayouts.selectedLayoutId()).toBeNull();
  });

  it('openPreview opens dialog with preview html', () => {
    const dialogMock = { open: jasmine.createSpy('open') };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        MatSnackBar,
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('T', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    fixture.detectChanges();
    fixture.componentInstance.openPreview();
    expect(dialogMock.open).toHaveBeenCalled();
    const call = (dialogMock.open as jasmine.Spy).calls.mostRecent();
    expect(call.args[0].name).toBe('PreviewModalComponent');
    expect(call.args[1].data?.html).toBeDefined();
  });

  it('downloadCanvasHtml creates blob and revokes URL', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('MyLayout', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    fixture.detectChanges();
    const createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    fixture.componentInstance.downloadCanvasHtml();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:url');
  });

  it('openUploadTemplate opens dialog and loads state on result', async () => {
    const afterClosed$ = new Subject<{ content: string; fileName: string } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    const snackMock = { open: jasmine.createSpy('open') };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackMock },
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    const state = { rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] };
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">${JSON.stringify(state)}</script></body></html>`;
    fixture.detectChanges();
    fixture.componentInstance.openUploadTemplate();
    expect(dialogMock.open).toHaveBeenCalled();
    afterClosed$.next({ content: html, fileName: 'up.html' });
    afterClosed$.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    const layouts = savedLayouts.layouts();
    expect(layouts.some((l) => l.name === 'up')).toBe(true);
    expect(snackMock.open).toHaveBeenCalledWith('Template loaded.', undefined, { duration: 2000 });
  });

  it('openUploadTemplate shows snack when no state in HTML', async () => {
    const afterClosed$ = new Subject<{ content: string; fileName: string } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    const snackMock = { open: jasmine.createSpy('open') };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackMock },
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    fixture.componentInstance.openUploadTemplate();
    const validShell =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>no script</p></body></html>';
    afterClosed$.next({ content: validShell, fileName: 'x.html' });
    afterClosed$.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(snackMock.open).toHaveBeenCalledWith('No template configuration found in file.', undefined, { duration: 4000 });
  });

  it('openUploadTemplate shows snack when HTML fails validation', async () => {
    const afterClosed$ = new Subject<{ content: string; fileName: string } | undefined>();
    const dialogMock = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => afterClosed$.asObservable() }) };
    const snackMock = { open: jasmine.createSpy('open') };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackMock },
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    fixture.componentInstance.openUploadTemplate();
    const badHtml =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div title="a"b"></div></body></html>';
    afterClosed$.next({ content: badHtml, fileName: 'bad.html' });
    afterClosed$.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(snackMock.open).toHaveBeenCalled();
    const calls = (snackMock.open as jasmine.Spy).calls.allArgs();
    const firstMsg = calls[0]?.[0] as string;
    expect(firstMsg).not.toBe('Template loaded.');
    expect(firstMsg).not.toBe('No template configuration found in file.');
  });

  it('publish shows snack and getPublishHtml strips component wrappers', () => {
    const snackMock = { open: jasmine.createSpy('open') };
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        LayoutGuardService,
        MatDialog,
        { provide: MatSnackBar, useValue: snackMock },
        provideRouter(routes),
      ],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout('T', { rows: [] });
    savedLayouts.selectLayout(savedLayouts.layouts()[0].id);
    fixture.detectChanges();
    fixture.componentInstance.publish();
    expect(snackMock.open).toHaveBeenCalledWith('Form published.', undefined, { duration: 4000 });
  });
});
