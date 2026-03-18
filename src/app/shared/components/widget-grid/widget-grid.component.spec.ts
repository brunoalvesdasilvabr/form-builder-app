import { TestBed } from '@angular/core/testing';
import { WidgetGridComponent } from './widget-grid.component';
import type { WidgetInstance } from '../../models/canvas.model';
import { WIDGET_TYPE_GRID } from '../../models/canvas.model';

describe('WidgetGridComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetGridComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('columns returns widget gridColumns when present', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    const cols = [{ id: 'c1', columnName: 'Col 1' }];
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid', gridColumns: cols } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.columns()).toEqual(cols);
  });

  it('hasColumnName returns true when columnName non-empty', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.hasColumnName({ columnName: ' X ' })).toBe(true);
    expect(fixture.componentInstance.hasColumnName({ columnName: '' })).toBe(false);
  });

  it('getColumnDef returns columnName when set else id', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getColumnDef({ id: 'c1', columnName: 'Name' })).toBe('Name');
    expect(fixture.componentInstance.getColumnDef({ id: 'c1' })).toBe('c1');
  });

  it('getDisplayKey returns activityDataProperty when set', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getDisplayKey({ id: 'c1', activityDataProperty: 'prop' })).toBe('prop');
  });

  it('getColumnClass includes grid-col-selected when selected', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.componentRef.setInput('selectedColumnIndex', 0);
    fixture.detectChanges();
    const cls = fixture.componentInstance.getColumnClass({}, 0);
    expect(cls).toContain('grid-col-selected');
  });

  it('setColumnHover updates hoveredColumnIndex', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    fixture.componentInstance.setColumnHover(1);
    expect(fixture.componentInstance.hoveredColumnIndex()).toBe(1);
    fixture.componentInstance.setColumnHover(null);
    expect(fixture.componentInstance.hoveredColumnIndex()).toBeNull();
  });

  it('getGridBindingPath returns null for non-grid widget', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.getGridBindingPath()).toBeNull();
  });

  it('getGridBindingPath returns path for grid with valueBinding', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid', valueBinding: 'path.to.activities' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.getGridBindingPath()).toBeTruthy();
  });

  it('getColumnBindingPath returns valueBinding when no activityDataProperty', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getColumnBindingPath({ valueBinding: 'x.y' })).toBe('x.y');
  });

  it('getColumnBindingPath returns valueBinding.activityDataProperty when activityDataProperty set', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getColumnBindingPath({ valueBinding: 'arr', activityDataProperty: 'amount' })).toBe('arr.amount');
  });

  it('getColumnAlignment returns Left when not set', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getColumnAlignment({})).toBe('left');
  });

  it('getHeaderAlignment returns alignment when valid', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.getHeaderAlignment({ headerAlignment: 'center' })).toBe('center');
  });

  it('isColumnSortable returns true when sortable set', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.isColumnSortable({ sortable: true })).toBe(true);
    expect(fixture.componentInstance.isColumnSortable({})).toBe(false);
  });

  it('showHeaderRow is true when at least one column has name', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid', gridColumns: [{ id: 'c1', columnName: 'H1' }] } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.showHeaderRow()).toBe(true);
  });

  it('showTotalRow is false when placeholder data', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    expect(fixture.componentInstance.showTotalRow()).toBe(false);
  });

  it('gridFooterText and gridHeaderAlignment return from widget', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid', gridFooterText: 'Footer', gridHeaderAlignment: 'center' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.gridFooterText()).toBe('Footer');
    expect(fixture.componentInstance.gridHeaderAlignment()).toBe('center');
  });

  it('getColumnClass includes grid-col-hovered when hovered', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' });
    fixture.detectChanges();
    fixture.componentInstance.setColumnHover(2);
    const cls = fixture.componentInstance.getColumnClass({}, 2);
    expect(cls).toContain('grid-col-hovered');
  });

  it('hostClass returns innerClassName from widget', () => {
    const fixture = TestBed.createComponent(WidgetGridComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid', innerClassName: 'my-grid' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('my-grid');
  });
});
