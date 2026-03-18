import { TestBed } from '@angular/core/testing';
import { CanvasService } from './canvas.service';
import type { CanvasState, NestedTableState } from '../../shared/models/canvas.model';
import { SelectedTarget, TextAlignment } from '../../shared/enums';
import { UNDO_LIMIT } from '../../shared/constants/canvas.constants';

describe('CanvasService', () => {
  let service: CanvasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getState returns initial empty rows', () => {
    const state = service.getState();
    expect(state.rows).toEqual([]);
  });

  it('loadState replaces state', () => {
    const newState: CanvasState = {
      rows: [
        {
          id: 'r0',
          cells: [
            {
              id: 'c0',
              rowIndex: 0,
              colIndex: 0,
              widgets: [],
              colSpan: 1,
              rowSpan: 1,
              isMergedOrigin: true,
            },
          ],
        },
      ],
    };
    service.loadState(newState);
    expect(service.getState().rows.length).toBe(1);
    expect(service.rows().length).toBe(1);
  });

  it('setSelectedCell updates selectedCellId and selectedWidgetId', () => {
    service.setSelectedCell('cell-1', SelectedTarget.Cell, undefined, 'widget-1');
    expect(service.selectedCellId()).toBe('cell-1');
    expect(service.selectedWidgetId()).toBe('widget-1');
    service.setSelectedCell(null);
    expect(service.selectedCellId()).toBeNull();
    expect(service.selectedWidgetId()).toBeNull();
  });

  it('undo returns false when stack empty', () => {
    expect(service.undo()).toBe(false);
  });

  it('undo restores state after pushHistory', () => {
    const state: CanvasState = { rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] };
    service.loadState(state);
    service.addRowAt(0);
    expect(service.rows().length).toBe(2);
    service.undo();
    expect(service.rows().length).toBe(1);
  });

  it('clearUndoHistory clears stack', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.addRowAt(0);
    service.clearUndoHistory();
    expect(service.canUndo()).toBe(false);
    expect(service.undo()).toBe(false);
  });

  it('getSpan returns 1,1 when no cell at position', () => {
    const span = service.getSpan(0, 0);
    expect(span).toEqual({ colSpan: 1, rowSpan: 1 });
  });

  it('mergeCells merges range and combines widgets', () => {
    const state: CanvasState = {
      rows: [
        {
          id: 'r0',
          cells: [
            { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
            { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [{ id: 'w2', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          ],
        },
      ],
    };
    service.loadState(state);
    service.mergeCells(0, 0, 0, 1);
    const s = service.getState();
    expect(s.rows[0].cells[0].colSpan).toBe(2);
    expect(s.rows[0].cells[0].widgets.length).toBe(2);
  });

  it('addRowAt adds row', () => {
    const state: CanvasState = {
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    };
    service.loadState(state);
    service.addRowAt(0);
    expect(service.rows().length).toBe(2);
  });

  it('addColumnAt adds column', () => {
    const state: CanvasState = {
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    };
    service.loadState(state);
    service.addColumnAt(0);
    expect(service.rows()[0].cells.length).toBe(2);
  });

  it('getStateForSave returns copy of state', () => {
    const state: CanvasState = { rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] };
    service.loadState(state);
    const saved = service.getStateForSave();
    expect(saved).not.toBe(service.getState());
    expect(JSON.stringify(saved)).toBe(JSON.stringify(service.getState()));
  });

  it('setWidgetOnEmptyCanvas adds first row and widget', () => {
    service.setWidgetOnEmptyCanvas('label', 'My Label');
    const state = service.getState();
    expect(state.rows.length).toBe(1);
    expect(state.rows[0].cells[0].widgets.length).toBe(1);
    expect(state.rows[0].cells[0].widgets[0].type).toBe('label');
    expect(state.rows[0].cells[0].widgets[0].label).toBe('My Label');
  });

  it('setWidgetOnEmptyCanvas does nothing when canvas has rows', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.setWidgetOnEmptyCanvas('label');
    expect(service.rows().length).toBe(1);
    expect(service.rows()[0].cells[0].widgets.length).toBe(0);
  });

  it('getInitialLayoutState returns 1 row with 3 cells', () => {
    const state = service.getInitialLayoutState();
    expect(state.rows.length).toBe(1);
    expect(state.rows[0].cells.length).toBe(3);
  });

  it('getDefaultState returns empty rows', () => {
    expect(service.getDefaultState().rows).toEqual([]);
  });

  it('setWidgetAt adds widget to cell', () => {
    service.loadState({
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    });
    service.setWidgetAt(0, 0, 'input', 'Field');
    expect(service.rows()[0].cells[0].widgets.length).toBe(1);
    expect(service.rows()[0].cells[0].widgets[0].type).toBe('input');
  });

  it('removeRowAt returns false when only one row', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    expect(service.removeRowAt(0)).toBe(false);
  });

  it('removeRowAt returns true and removes row when 2+ rows', () => {
    service.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    expect(service.removeRowAt(1)).toBe(true);
    expect(service.rows().length).toBe(1);
  });

  it('removeColumnAt returns false when only one column', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    expect(service.removeColumnAt(0)).toBe(false);
  });

  it('removeColumnAt returns true and removes column when 2+ columns', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    expect(service.removeColumnAt(1)).toBe(true);
    expect(service.rows()[0].cells.length).toBe(1);
  });

  it('updateCellClass sets className on cell', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateCellClass('c0', ' my-class ');
    expect(service.getState().rows[0].cells[0].className).toBe('my-class');
  });

  it('setCanvasSelection and clearCanvasSelection', () => {
    service.setCanvasSelection(['0,0', '0,1']);
    expect(service.canvasSelectionCells().length).toBe(2);
    service.clearCanvasSelection();
    expect(service.canvasSelectionCells().length).toBe(0);
  });

  it('setNestedSelection and clearNestedSelection', () => {
    service.setNestedSelection('pc1', 'pw1', ['0,0', '0,1']);
    expect(service.nestedSelectionPath()).toEqual({ parentCellId: 'pc1', parentWidgetId: 'pw1' });
    expect(service.nestedSelectionCells().length).toBe(2);
    service.clearNestedSelection();
    expect(service.nestedSelectionPath()).toBeNull();
    expect(service.nestedSelectionCells().length).toBe(0);
  });

  it('setNestedSelection with empty array clears path', () => {
    service.setNestedSelection('pc1', 'pw1', []);
    expect(service.nestedSelectionPath()).toBeNull();
  });

  it('selectedCell returns cell by selectedCellId', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.setSelectedCell('c0');
    expect(service.selectedCell()?.id).toBe('c0');
  });

  it('removeWidget removes widget and clears selection if cell was selected', () => {
    service.loadState({
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
    service.setSelectedCell('c0', SelectedTarget.Cell, undefined, 'w1');
    service.removeWidget('c0', 'w1');
    expect(service.rows()[0].cells[0].widgets.length).toBe(1);
    expect(service.selectedCellId()).toBeNull();
  });

  it('moveWidget moves widget from one cell to another', () => {
    const w: any = { id: 'w1', type: 'label' };
    service.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [w], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    service.moveWidget('c0', 'c1', w);
    expect(service.rows()[0].cells[0].widgets.length).toBe(0);
    expect(service.rows()[0].cells[1].widgets.length).toBe(1);
  });

  it('moveWidget does nothing when fromCellId === toCellId', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.moveWidget('c0', 'c0', { id: 'w1', type: 'label' } as any);
    expect(service.rows()[0].cells[0].widgets.length).toBe(1);
  });

  it('getControlNamesInLayout returns sorted form control names', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [
            { id: 'w1', type: 'input', formControlName: 'b' },
            { id: 'w2', type: 'checkbox', formControlName: 'a' },
          ],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.getControlNamesInLayout()).toEqual(['a', 'b']);
  });

  it('bindablePropertiesGrid and bindablePropertiesColumn return arrays', () => {
    expect(service.bindablePropertiesGrid.length).toBeGreaterThan(0);
    expect(service.bindablePropertiesColumn.length).toBeGreaterThanOrEqual(0);
  });

  it('setSelectedGridColumnIndex and setSelectedOptionIndex', () => {
    service.setSelectedGridColumnIndex(1);
    expect(service.selectedGridColumnIndex()).toBe(1);
    service.setSelectedOptionIndex(0);
    expect(service.selectedOptionIndex()).toBe(0);
  });

  it('getNestedMergeRange returns null when no nested selection', () => {
    expect(service.getNestedMergeRange()).toBeNull();
  });

  it('canMergeNested returns false when no range', () => {
    expect(service.canMergeNested()).toBe(false);
  });

  it('setSelectedNestedCell sets selectedNestedPath', () => {
    service.setSelectedNestedCell('pc1', 'pw1', 'nc1');
    expect(service.selectedNestedPath()).toEqual({ parentCellId: 'pc1', parentWidgetId: 'pw1', nestedCellId: 'nc1' });
    expect(service.selectedCellId()).toBeNull();
  });

  it('loadState clears selectedOptionIndex and selectedNestedPath', () => {
    service.setSelectedOptionIndex(1);
    service.setSelectedNestedCell('p', 'w', 'n');
    service.loadState({ rows: [] });
    expect(service.selectedOptionIndex()).toBeNull();
    expect(service.selectedNestedPath()).toBeNull();
  });

  it('updateWidgetLabel updates label', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'label', label: 'Old' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateWidgetLabel('c0', 'w1', 'New Label');
    expect(service.getState().rows[0].cells[0].widgets[0].label).toBe('New Label');
  });

  it('updateWidgetFormControlName sets formControlName', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateWidgetFormControlName('c0', 'w1', ' myControl ');
    expect(service.getState().rows[0].cells[0].widgets[0].formControlName).toBe('myControl');
  });

  it('updateWidgetVisibilityCondition sets visibilityCondition', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateWidgetVisibilityCondition('c0', 'w1', ' {{ x }} ');
    expect(service.getState().rows[0].cells[0].widgets[0].visibilityCondition).toBe('{{ x }}');
  });

  it('updateValueBinding sets valueBinding in template form', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateValueBinding('c0', 'w1', 'path.to.value');
    expect(service.getState().rows[0].cells[0].widgets[0].valueBinding).toBe('{{ path.to.value }}');
  });

  it('setSelectedCell with element sets selectedElementKey', () => {
    service.setSelectedCell('c0', SelectedTarget.Element, 'control');
    expect(service.selectedTarget()).toBe(SelectedTarget.Element);
    expect(service.selectedElementKey()).toBe('control');
  });

  it('pushHistory trims undo stack when over UNDO_LIMIT', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    for (let i = 0; i < UNDO_LIMIT + 5; i++) {
      service.addRowAt(0);
    }
    expect(service.canUndo()).toBe(true);
    for (let i = 0; i < 10; i++) service.undo();
    expect(service.rows().length).toBeGreaterThanOrEqual(1);
  });

  it('setSelectedCell clears selectedGridColumnIndex when cell has no grid', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.setSelectedGridColumnIndex(0);
    service.setSelectedCell('c0');
    expect(service.selectedGridColumnIndex()).toBeNull();
  });

  it('selectedCell returns nested cell when selectedNestedPath set', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.setSelectedNestedCell('c0', 'w1', 'nc0');
    expect(service.selectedCell()?.id).toBe('nc0');
  });

  it('setNestedSelection with non-empty clears canvas selection', () => {
    service.setCanvasSelection(['0,0']);
    service.setNestedSelection('p', 'w', ['0,0']);
    expect(service.canvasSelectionCells().length).toBe(0);
  });

  it('updateWidgetClass sets className', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetClass('c0', 'w1', '  w-class  ');
    expect(service.getState().rows[0].cells[0].widgets[0].className).toBe('w-class');
  });

  it('updateWidgetInnerClass sets innerClassName', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetInnerClass('c0', 'w1', 'inner');
    expect(service.getState().rows[0].cells[0].widgets[0].innerClassName).toBe('inner');
  });

  it('updateWidgetElementClass sets and clears elementClasses', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetElementClass('c0', 'w1', 'control', 'ctrl-class');
    expect(service.getState().rows[0].cells[0].widgets[0].elementClasses?.['control']).toBe('ctrl-class');
    service.updateWidgetElementClass('c0', 'w1', 'control', '  ');
    expect(service.getState().rows[0].cells[0].widgets[0].elementClasses).toBeUndefined();
  });

  it('updateWidgetMinLength and updateWidgetMaxLength set validator values', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetMinLength('c0', 'w1', 2);
    service.updateWidgetMaxLength('c0', 'w1', 10);
    expect(service.getState().rows[0].cells[0].widgets[0].minLength).toBe(2);
    expect(service.getState().rows[0].cells[0].widgets[0].maxLength).toBe(10);
  });

  it('updateWidgetMin and updateWidgetMax set validator values', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetMin('c0', 'w1', 0);
    service.updateWidgetMax('c0', 'w1', 100);
    expect(service.getState().rows[0].cells[0].widgets[0].min).toBe(0);
    expect(service.getState().rows[0].cells[0].widgets[0].max).toBe(100);
  });

  it('updateWidgetPattern sets pattern', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    service.updateWidgetPattern('c0', 'w1', ' [a-z]+ ');
    expect(service.getState().rows[0].cells[0].widgets[0].pattern).toBe('[a-z]+');
  });

  it('updateOptionBinding sets optionBindings', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'radio', options: ['A', 'B'] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateOptionBinding('c0', 'w1', 0, 'path.option1');
    expect(service.getState().rows[0].cells[0].widgets[0].optionBindings?.[0]).toBe('{{ path.option1 }}');
  });

  it('removeRowAt returns false for invalid index', () => {
    service.loadState({
      rows: [
        { id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
        { id: 'r1', cells: [{ id: 'c1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      ],
    });
    expect(service.removeRowAt(-1)).toBe(false);
    expect(service.removeRowAt(2)).toBe(false);
    expect(service.rows().length).toBe(2);
  });

  it('removeColumnAt returns false for invalid index', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      }],
    });
    expect(service.removeColumnAt(-1)).toBe(false);
    expect(service.removeColumnAt(2)).toBe(false);
    expect(service.rows()[0].cells.length).toBe(2);
  });

  it('unmergeCell splits merged cell', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    service.unmergeCell(0, 0);
    const s = service.getState();
    expect(s.rows[0].cells[0].colSpan).toBe(1);
    expect(s.rows[0].cells.length).toBe(2);
  });

  it('shouldSkipRendering returns true for cell covered by merge', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [
          { id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 2, rowSpan: 1, isMergedOrigin: true },
          { id: 'c1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: false },
        ],
      }],
    });
    expect(service.shouldSkipRendering(0, 1)).toBe(true);
    expect(service.shouldSkipRendering(0, 0)).toBe(false);
  });

  it('updateNestedTable updates table widget nested state', () => {
    const nested: NestedTableState = {
      rows: [{ id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    };
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: [] } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedTable('c0', 'w1', nested);
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows.length).toBe(1);
  });

  it('getControlNamesInLayout includes nested table form control names', () => {
    const nestedRows: NestedTableState['rows'] = [
      {
        id: 'nr0',
        cells: [{
          id: 'nc0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'nw1', type: 'input', formControlName: 'nestedControl' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.getControlNamesInLayout()).toContain('nestedControl');
  });

  it('getSelectedNestedRowCol returns row/col when nested cell selected', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.setSelectedNestedCell('c0', 'w1', 'nc0');
    expect(service.getSelectedNestedRowCol()).toEqual({ rowIndex: 0, colIndex: 0 });
  });

  it('getNestedTableSize returns rowCount and colCount', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }, { id: 'nc1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.getNestedTableSize('c0', 'w1')).toEqual({ rowCount: 1, colCount: 2 });
  });

  it('getNestedTableSize returns null when no nested table', () => {
    service.loadState({ rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }] });
    expect(service.getNestedTableSize('c0', 'w1')).toBeNull();
  });

  it('removeNestedRowAt removes row and returns true', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
      { id: 'nr1', cells: [{ id: 'nc1', rowIndex: 1, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.removeNestedRowAt('c0', 'w1', 1)).toBe(true);
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows.length).toBe(1);
  });

  it('removeNestedRowAt returns false when single row or invalid index', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.removeNestedRowAt('c0', 'w1', 0)).toBe(false);
    expect(service.removeNestedRowAt('c0', 'w1', -1)).toBe(false);
  });

  it('removeNestedColumnAt returns false when single column or invalid index', () => {
    const singleCol: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: singleCol } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.removeNestedColumnAt('c0', 'w1', 0)).toBe(false);
    expect(service.removeNestedColumnAt('c0', 'w1', -1)).toBe(false);
  });

  it('removeNestedColumnAt removes column and returns true', () => {
    const nestedRows: NestedTableState['rows'] = [
      {
        id: 'nr0',
        cells: [
          { id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'nc1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    expect(service.removeNestedColumnAt('c0', 'w1', 1)).toBe(true);
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells.length).toBe(1);
  });

  it('updateGridDataSourcePreview sets gridDataSourcePreview', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'a' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridDataSourcePreview('c0', 'w1', [{ a: 1 }]);
    expect(service.getState().rows[0].cells[0].widgets[0].gridDataSourcePreview).toEqual([{ a: 1 }]);
  });

  it('addGridColumn appends column', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.addGridColumn('c0', 'w1');
    expect(service.getState().rows[0].cells[0].widgets[0].gridColumns?.length).toBe(2);
  });

  it('updateGridColumnBinding sets column binding and preview for activities', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }, { id: 'col1', columnName: 'B' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridColumnBinding('c0', 'w1', 0, 'amsInformation.arrangements[0].amsActivity.activities', 'entryDate', 'Entry Date');
    const w = service.getState().rows[0].cells[0].widgets[0] as any;
    expect(w.gridColumns[0].valueBinding).toBe('amsInformation.arrangements[0].amsActivity.activities');
    expect(w.gridColumns[0].activityDataProperty).toBe('entryDate');
    expect(w.gridColumns[0].headerName).toBe('Entry Date');
    expect(w.gridDataSourcePreview?.length).toBe(3);
  });

  it('updateGridColumnBinding clears binding when valueBinding empty', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridColumnBinding('c0', 'w1', 0, '', '', undefined);
    expect(service.getState().rows[0].cells[0].widgets[0].gridColumns?.[0].valueBinding).toBeUndefined();
  });

  it('updateGridHeaderText and updateGridFooterText set text and alignment', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridHeaderText('c0', 'w1', ' Header ', TextAlignment.Center);
    service.updateGridFooterText('c0', 'w1', ' Footer ', TextAlignment.Right);
    const w = service.getState().rows[0].cells[0].widgets[0] as any;
    expect(w.gridHeaderText).toBe('Header');
    expect(w.gridHeaderAlignment).toBe(TextAlignment.Center);
    expect(w.gridFooterText).toBe('Footer');
    expect(w.gridFooterAlignment).toBe(TextAlignment.Right);
  });

  it('updateGridColumnName sets columnName', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'Old' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridColumnName('c0', 'w1', 0, ' NewName ');
    expect(service.getState().rows[0].cells[0].widgets[0].gridColumns?.[0].columnName).toBe('NewName');
  });

  it('updateGridColumnClassAndAlignment sets className and alignment', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridColumnClassAndAlignment('c0', 'w1', 0, ' num ', TextAlignment.Right);
    const col = service.getState().rows[0].cells[0].widgets[0].gridColumns?.[0];
    expect(col?.className).toBe('num');
    expect(col?.alignment).toBe(TextAlignment.Right);
  });

  it('updateGridColumnDetails sets headerAlignment and sortable', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateGridColumnDetails('c0', 'w1', 0, TextAlignment.Center, true);
    const col = service.getState().rows[0].cells[0].widgets[0].gridColumns?.[0];
    expect(col?.headerAlignment).toBe(TextAlignment.Center);
    expect(col?.sortable).toBe(true);
  });

  it('addGridRow appends row to gridDataSourcePreview', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.addGridRow('c0', 'w1');
    expect(service.getState().rows[0].cells[0].widgets[0].gridDataSourcePreview?.length).toBe(1);
  });

  it('updateWidgetOptions sets options and optionBindings', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'radio', options: ['X', 'Y'], optionBindings: ['', ''] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateWidgetOptions('c0', 'w1', ['A', 'B', 'C']);
    const w = service.getState().rows[0].cells[0].widgets[0];
    expect(w.options).toEqual(['A', 'B', 'C']);
    expect(w.optionBindings?.length).toBe(3);
  });

  it('updateValueBinding with empty propertyName clears valueBinding', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', valueBinding: '{{ x }}' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateValueBinding('c0', 'w1', '');
    expect(service.getState().rows[0].cells[0].widgets[0].valueBinding).toBeUndefined();
  });

  it('getStateForSave normalizes valueBinding and optionBindings to paths', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [
            { id: 'w1', type: 'input', valueBinding: '{{ path.to.value }}' },
            { id: 'w2', type: 'radio', options: ['A'], optionBindings: ['{{ opt.path }}'] },
          ],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    const saved = service.getStateForSave();
    expect(saved.rows[0].cells[0].widgets[0].valueBinding).toBe('path.to.value');
    expect(saved.rows[0].cells[0].widgets[1].optionBindings?.[0]).toBe('opt.path');
  });

  it('createDefaultNestedTable returns nested state', () => {
    const nested = service.createDefaultNestedTable();
    expect(nested.rows.length).toBeGreaterThan(0);
    expect(nested.rows[0].cells.length).toBeGreaterThan(0);
  });

  it('setWidgetOnEmptyCanvas with options creates radio options', () => {
    service.setWidgetOnEmptyCanvas('radio', undefined, ['Yes', 'No']);
    const w = service.getState().rows[0].cells[0].widgets[0];
    expect(w.options).toEqual(['Yes', 'No']);
  });

  it('updateNestedCellClass sets nested cell className', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedCellClass('c0', 'w1', 'nc0', ' nested-cell ');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].className).toBe('nested-cell');
  });

  it('updateNestedWidgetClass sets nested widget className', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'nw1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedWidgetClass('c0', 'w1', 'nc0', 'nw1', 'nested-w-class');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].className).toBe('nested-w-class');
  });

  it('updateNestedValueBinding and updateNestedOptionBinding set nested bindings', () => {
    const nestedRows: NestedTableState['rows'] = [
      {
        id: 'nr0',
        cells: [{
          id: 'nc0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'nw1', type: 'input' }, { id: 'nw2', type: 'radio', options: ['A', 'B'] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedValueBinding('c0', 'w1', 'nc0', 'nw1', 'nested.path');
    service.updateNestedOptionBinding('c0', 'w1', 'nc0', 'nw2', 0, 'opt.path');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].valueBinding).toBe('{{ nested.path }}');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[1].optionBindings?.[0]).toBe('{{ opt.path }}');
  });

  it('updateNestedWidgetFormControlName and updateNestedWidgetVisibilityCondition', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'nw1', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedWidgetFormControlName('c0', 'w1', 'nc0', 'nw1', ' nestedCtrl ');
    service.updateNestedWidgetVisibilityCondition('c0', 'w1', 'nc0', 'nw1', ' {{ visible }} ');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].formControlName).toBe('nestedCtrl');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].visibilityCondition).toBe('{{ visible }}');
  });

  it('updateNestedWidgetLabel updates nested widget label', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'nw1', type: 'label', label: 'Old' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedWidgetLabel('c0', 'w1', 'nc0', 'nw1', 'New Nested Label');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].label).toBe('New Nested Label');
  });

  it('updateNestedWidgetMinLength and updateNestedWidgetPattern set nested validator and pattern', () => {
    const nestedRows: NestedTableState['rows'] = [
      { id: 'nr0', cells: [{ id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'nw1', type: 'input' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.updateNestedWidgetMinLength('c0', 'w1', 'nc0', 'nw1', 1);
    service.updateNestedWidgetPattern('c0', 'w1', 'nc0', 'nw1', ' [0-9]+ ');
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].minLength).toBe(1);
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].widgets[0].pattern).toBe('[0-9]+');
  });

  it('mergeNestedSelection merges nested cells and clears selection', () => {
    const nestedRows: NestedTableState['rows'] = [
      {
        id: 'nr0',
        cells: [
          { id: 'nc0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
          { id: 'nc1', rowIndex: 0, colIndex: 1, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true },
        ],
      },
    ];
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: nestedRows } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.setNestedSelection('c0', 'w1', ['0,0', '0,1']);
    service.mergeNestedSelection();
    expect(service.getState().rows[0].cells[0].widgets[0].nestedTable?.rows[0].cells[0].colSpan).toBe(2);
    expect(service.nestedSelectionPath()).toBeNull();
  });

  it('getSelectedNestedRowCol returns null when no nested path', () => {
    expect(service.getSelectedNestedRowCol()).toBeNull();
  });

  it('selectedCell returns null when selectedNestedPath points to missing cell', () => {
    service.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table', nestedTable: { rows: [] } } as any],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    service.setSelectedNestedCell('c0', 'w1', 'nonexistent');
    expect(service.selectedCell()).toBeNull();
  });
});
