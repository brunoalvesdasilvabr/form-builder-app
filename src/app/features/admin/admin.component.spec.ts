import { TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { CanvasService } from '../../core/services/canvas.service';
import { SavedLayoutsService } from '../../core/services/saved-layouts.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { SelectedTarget } from '../../shared/enums';

describe('AdminComponent', () => {
  const mockSnackBar = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    mockSnackBar.open.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        CanvasService,
        SavedLayoutsService,
        { provide: MatSnackBar, useValue: mockSnackBar },
        provideRouter(routes),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('closeRightPanel clears selection', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('cell-1');
    fixture.componentInstance.closeRightPanel();
    expect(canvas.selectedCellId()).toBeNull();
  });

  it('getPropertiesPanelTitle returns Properties when no cell', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Properties');
  });

  it('getSelectedWidget returns null when cell is null', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance.getSelectedWidget(null)).toBeNull();
  });

  it('getSelectedWidget returns primary widget when cell has widgets', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const cell = {
      id: 'c0',
      widgets: [{ id: 'w1', type: 'label' }],
    } as any;
    expect(fixture.componentInstance.getSelectedWidget(cell)?.id).toBe('w1');
  });

  it('isCellSelection returns true when target is Cell', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('c0', SelectedTarget.Cell);
    fixture.detectChanges();
    expect(fixture.componentInstance.isCellSelection()).toBe(true);
  });

  it('showControlNameSection returns false when cell selection', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('c0', SelectedTarget.Cell);
    fixture.detectChanges();
    const cell = { id: 'c0', widgets: [{ id: 'w1', type: 'input' }] } as any;
    expect(fixture.componentInstance.showControlNameSection(cell)).toBe(false);
  });

  it('exposes widget type constants', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance.widgetTypeGrid).toBe('grid');
    expect(fixture.componentInstance.widgetTypeInput).toBe('input');
    expect(fixture.componentInstance.widgetTypeTable).toBe('table');
  });

  it('isCellSelection returns false when target is not Cell', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('c0', SelectedTarget.Element);
    fixture.detectChanges();
    expect(fixture.componentInstance.isCellSelection()).toBe(false);
  });

  it('showControlNameSection returns true when element selected and data widget', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('c0', SelectedTarget.Element);
    fixture.detectChanges();
    const cell = { id: 'c0', widgets: [{ id: 'w1', type: 'input' }] } as any;
    expect(fixture.componentInstance.showControlNameSection(cell)).toBe(true);
  });

  it('getPropertiesPanelTitle returns Cell Properties when target is Cell', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Cell);
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Cell Properties');
  });

  it('getPropertiesPanelTitle returns Label Properties for label widget', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Label Properties');
  });

  it('getPropertiesPanelTitle returns Grid Properties when grid selected and no column', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'col0', headerName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    canvas.setSelectedGridColumnIndex(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Grid Properties');
  });

  it('getPropertiesPanelTitle returns Column N Properties when grid column selected', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', gridColumns: [{ id: 'col0', columnName: 'col0', headerName: 'A' }, { id: 'col1', columnName: 'col1', headerName: 'B' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    canvas.setSelectedGridColumnIndex(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Column 2 Properties');
  });

  it('getPropertiesPanelTitle returns Table Properties and Panel Properties for typeLabels', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Table Properties');
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w2', type: 'panel' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w2');
    fixture.detectChanges();
    expect(fixture.componentInstance.getPropertiesPanelTitle()).toBe('Panel Properties');
  });

  it('formGroupName returns slugified layout name', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const savedLayouts = TestBed.inject(SavedLayoutsService);
    savedLayouts.addLayout(' My Form ', { rows: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.formGroupName()).toBe('my_form');
  });

  it('gridHasActivitiesBinding returns true when grid has activities valueBinding', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'grid', valueBinding: '{{ amsInformation.arrangements[0].amsActivity.activities }}', gridColumns: [{ id: 'col0', columnName: 'A' }] }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.gridHasActivitiesBinding()).toBe(true);
  });

  it('effectiveBindableProperties returns bindablePropertiesColumn when grid selected', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
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
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.effectiveBindableProperties()).toBe(fixture.componentInstance.bindablePropertiesColumn);
  });

  it('showMainDataBindingDropdown returns false for table and true for label', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'table' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.showMainDataBindingDropdown()).toBe(false);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w2', type: 'label' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w2');
    fixture.detectChanges();
    expect(fixture.componentInstance.showMainDataBindingDropdown()).toBe(true);
  });

  it('applyDisabled returns true when data component selected and control name empty', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
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
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.componentInstance.pendingFormControlName.set('');
    fixture.detectChanges();
    expect(fixture.componentInstance.applyDisabled()).toBe(true);
  });

  it('showVisibilityConditionSection returns false for grid and true for input', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
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
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.showVisibilityConditionSection()).toBe(false);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w2', type: 'input' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w2');
    fixture.detectChanges();
    expect(fixture.componentInstance.showVisibilityConditionSection()).toBe(true);
  });

  it('applyChanges does nothing when no cell selected', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    fixture.componentInstance.applyChanges();
    expect(mockSnackBar.open).not.toHaveBeenCalled();
  });

  it('applyChanges shows snackbar when data component and control name empty', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
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
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.componentInstance.pendingFormControlName.set('');
    fixture.detectChanges();
    fixture.componentInstance.applyChanges();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Control name is required for this component.', undefined, { duration: 4000 });
  });

  it('applyChanges applies class change and shows snackbar', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Cell);
    fixture.detectChanges();
    fixture.componentInstance.pendingClass.set('new-class');
    fixture.componentInstance.applyChanges();
    expect(canvas.getState().rows[0].cells[0].className).toBe('new-class');
    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('applyChanges shows Properties applied when nothing changed', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'panel' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    fixture.componentInstance.applyChanges();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Properties applied.', undefined, { duration: 2500 });
  });

  it('onDataBindingChange clears pendingActivityDataProperty when value not in ACTIVITIES paths', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.pendingActivityDataProperty.set('entryDate');
    fixture.componentInstance.onDataBindingChange('some.other.path');
    expect(fixture.componentInstance.pendingActivityDataProperty()).toBe('');
  });

  it('closePanel clears insertSnippetChoice and selection', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedCell('c0');
    fixture.componentInstance.insertSnippetChoice.set('0');
    fixture.componentInstance.closePanel();
    expect(fixture.componentInstance.insertSnippetChoice()).toBe('');
    expect(canvas.selectedCellId()).toBeNull();
  });

  it('getSnippetPreview replaces form and ctrl placeholders', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.pendingFormControlName.set('myControl');
    fixture.detectChanges();
    const result = fixture.componentInstance.getSnippetPreview({ template: '{form}.{ctrl}' });
    expect(result).toContain('myControl');
    expect(result).toContain('form');
  });

  it('onInsertVisibilitySnippet appends snippet when not present', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    fixture.componentInstance.pendingVisibilityCondition.set('');
    fixture.componentInstance.onInsertVisibilitySnippet('0');
    expect(fixture.componentInstance.pendingVisibilityCondition().length).toBeGreaterThan(0);
  });

  it('onInsertVisibilitySnippet does nothing for empty or invalid index', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.pendingVisibilityCondition.set('x');
    fixture.componentInstance.onInsertVisibilitySnippet('');
    expect(fixture.componentInstance.pendingVisibilityCondition()).toBe('x');
    fixture.componentInstance.onInsertVisibilitySnippet('999');
    expect(fixture.componentInstance.pendingVisibilityCondition()).toBe('x');
  });

  it('clearVisibilityRule clears pending visibility condition', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.pendingVisibilityCondition.set('some condition');
    fixture.componentInstance.clearVisibilityRule();
    expect(fixture.componentInstance.pendingVisibilityCondition()).toBe('');
  });

  it('openAddRuleModal and closeAddRuleModal toggle addRuleModalOpen', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance.addRuleModalOpen()).toBe(false);
    fixture.componentInstance.openAddRuleModal();
    expect(fixture.componentInstance.addRuleModalOpen()).toBe(true);
    fixture.componentInstance.closeAddRuleModal();
    expect(fixture.componentInstance.addRuleModalOpen()).toBe(false);
  });

  it('insertRuleAndClose closes modal and clears insertSnippetChoice', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.openAddRuleModal();
    fixture.componentInstance.insertSnippetChoice.set('');
    fixture.componentInstance.insertRuleAndClose();
    expect(fixture.componentInstance.addRuleModalOpen()).toBe(false);
  });

  it('getClassTargetLabel returns cell for Cell target', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{ id: 'r0', cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [], colSpan: 1, rowSpan: 1, isMergedOrigin: true }] }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Cell);
    fixture.detectChanges();
    const cell = canvas.selectedCell();
    expect(fixture.componentInstance.getClassTargetLabel()).toBe('cell');
  });

  it('getClassTargetLabel returns component wrapper for Widget target', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Widget, undefined, 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.getClassTargetLabel()).toBe('component wrapper');
  });

  it('getClassTargetLabel returns element key for Element target', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{ id: 'c0', rowIndex: 0, colIndex: 0, widgets: [{ id: 'w1', type: 'label' }], colSpan: 1, rowSpan: 1, isMergedOrigin: true }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, 'control', 'w1');
    fixture.detectChanges();
    expect(fixture.componentInstance.getClassTargetLabel()).toBe('element (control)');
  });

  it('getClassTargetLabel returns column N for grid column selected', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
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
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    canvas.setSelectedGridColumnIndex(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.getClassTargetLabel()).toBe('column 2');
  });

  it('getBindingTargetLabel returns empty when no widget', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    expect(fixture.componentInstance.getBindingTargetLabel(null as any)).toBe('');
  });

  it('getBindingTargetLabel returns type label and option for radio with selectedOptionIndex', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.setSelectedOptionIndex(0);
    const cell = { id: 'c0', widgets: [{ id: 'w1', type: 'radio', options: ['Yes', 'No'] }] } as any;
    expect(fixture.componentInstance.getBindingTargetLabel(cell)).toContain('Radio');
    expect(fixture.componentInstance.getBindingTargetLabel(cell)).toContain('Yes');
  });

  it('getBindingHint returns Bound to label and prop when prop set', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', valueBinding: '{{ path.x }}' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    const cell = canvas.selectedCell()!;
    const hint = fixture.componentInstance.getBindingHint(cell);
    expect(hint).toContain('Bound to');
    expect(hint).toContain('path.x');
  });

  it('getBindingHint returns only Bound to label when no prop', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'label' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    const cell = canvas.selectedCell()!;
    expect(fixture.componentInstance.getBindingHint(cell)).toBe('Bound to: Label');
  });

  it('getEffectiveVisibilityCondition returns pending or widget visibilityCondition', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', visibilityCondition: 'saved' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    const cell = canvas.selectedCell();
    expect(fixture.componentInstance.getEffectiveVisibilityCondition(cell)).toBe('saved');
    fixture.componentInstance.pendingVisibilityCondition.set(' pending ');
    expect(fixture.componentInstance.getEffectiveVisibilityCondition(cell)).toBe('pending');
  });

  it('showValidatorValuesSection and showMinLengthInput etc return based on condition', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', visibilityCondition: 'x && control.minlength' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    const cell = canvas.selectedCell();
    expect(fixture.componentInstance.showValidatorValuesSection(cell)).toBe(true);
    expect(fixture.componentInstance.showMinLengthInput(cell)).toBe(true);
  });

  it('getCurrentBindingProperty returns path for input valueBinding', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', valueBinding: '{{ my.path }}' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    const cell = canvas.selectedCell()!;
    expect(fixture.componentInstance.getCurrentBindingProperty(cell)).toBe('my.path');
  });

  it('isActivitiesDropdownDisabled returns true when grid column selected and has activities binding', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{
            id: 'w1',
            type: 'grid',
            valueBinding: '{{ amsInformation.arrangements[0].amsActivity.activities }}',
            gridColumns: [{ id: 'col0', columnName: 'A' }],
          }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    canvas.setSelectedGridColumnIndex(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.isActivitiesDropdownDisabled()).toBe(true);
  });

  it('showActivityDataDropdown returns true when grid column selected and activities binding', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{
            id: 'w1',
            type: 'grid',
            valueBinding: '{{ amsInformation.arrangements[0].amsActivity.activities }}',
            gridColumns: [{ id: 'col0', columnName: 'A' }],
          }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    canvas.setSelectedGridColumnIndex(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.showActivityDataDropdown()).toBe(true);
  });

  it('applyChanges applies form control name and visibility condition for data component', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', formControlName: 'oldName' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    fixture.componentInstance.pendingFormControlName.set('newName');
    fixture.componentInstance.applyChanges();
    expect(canvas.getState().rows[0].cells[0].widgets[0].formControlName).toBe('newName');
    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('applyChanges applies validator values for input', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const canvas = TestBed.inject(CanvasService);
    canvas.loadState({
      rows: [{
        id: 'r0',
        cells: [{
          id: 'c0',
          rowIndex: 0,
          colIndex: 0,
          widgets: [{ id: 'w1', type: 'input', formControlName: 'f1' }],
          colSpan: 1,
          rowSpan: 1,
          isMergedOrigin: true,
        }],
      }],
    });
    canvas.setSelectedCell('c0', SelectedTarget.Element, undefined, 'w1');
    fixture.detectChanges();
    fixture.componentInstance.pendingMinLength.set('2');
    fixture.componentInstance.pendingMaxLength.set('10');
    fixture.componentInstance.applyChanges();
    expect(canvas.getState().rows[0].cells[0].widgets[0].minLength).toBe(2);
    expect(canvas.getState().rows[0].cells[0].widgets[0].maxLength).toBe(10);
  });
});
