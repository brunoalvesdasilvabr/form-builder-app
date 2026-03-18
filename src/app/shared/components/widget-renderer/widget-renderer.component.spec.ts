import { TestBed } from '@angular/core/testing';
import { WidgetRendererComponent } from './widget-renderer.component';
import type { WidgetInstance } from '../../models/canvas.model';
import { WIDGET_TYPE_GRID, WIDGET_TYPE_TABLE } from '../../models/canvas.model';
import { DragDropDataKey } from '../../constants/drag-drop.constants';

describe('WidgetRendererComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetRendererComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass includes widget--no-padding for grid type', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toContain('widget--no-padding');
  });

  it('hostClass includes widget--no-padding for table type', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toContain('widget--no-padding');
  });

  it('hostClass includes custom className when set', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', className: 'my-class' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toContain('my-class');
  });

  it('draggable is true when cellId is set', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' });
    fixture.componentRef.setInput('cellId', 'cell-1');
    fixture.detectChanges();
    expect(fixture.componentInstance.draggable).toBe('true');
  });

  it('draggable is null when cellId is not set', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' });
    fixture.detectChanges();
    expect(fixture.componentInstance.draggable).toBeNull();
  });

  it('widgetIdAttr returns widget id', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.widgetIdAttr).toBe('w1');
  });

  it('onDragStart sets dataTransfer when cellId and dataTransfer present', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.componentRef.setInput('cellId', 'c1');
    fixture.detectChanges();
    const setData = jasmine.createSpy();
    const e = { dataTransfer: { effectAllowed: '', setData } } as unknown as DragEvent;
    fixture.componentInstance.onDragStart(e);
    expect(setData).toHaveBeenCalled();
    expect(JSON.parse(setData.calls.mostRecent().args[1]).fromCellId).toBe('c1');
  });

  it('onDragStart does nothing when no cellId', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' });
    const setData = jasmine.createSpy();
    const e = { dataTransfer: { setData } } as unknown as DragEvent;
    fixture.componentInstance.onDragStart(e);
    expect(setData).not.toHaveBeenCalled();
  });

  it('onDragEnd sets isDragging false', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' });
    fixture.componentRef.setInput('cellId', 'c1');
    fixture.detectChanges();
    const e = { dataTransfer: { effectAllowed: '', setData: () => {} } } as unknown as DragEvent;
    fixture.componentInstance.onDragStart(e);
    fixture.componentInstance.onDragEnd();
    expect(fixture.componentInstance.hostClass).not.toContain('widget-dragging');
  });

  it('onHostDragOver emits cellDragOver for grid when GridAction type', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.cellDragOver.subscribe(() => (emitted = true));
    const e = { dataTransfer: { types: [DragDropDataKey.GridActionCol] }, preventDefault: () => {}, stopPropagation: () => {} } as unknown as DragEvent;
    fixture.componentInstance.onHostDragOver(e);
    expect(emitted).toBe(true);
  });

  it('onHostDragOver does nothing for non-grid widget', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.cellDragOver.subscribe(() => (emitted = true));
    const e = { dataTransfer: { types: [DragDropDataKey.GridActionCol] } } as unknown as DragEvent;
    fixture.componentInstance.onHostDragOver(e);
    expect(emitted).toBe(false);
  });

  it('onHostDrop emits cellDrop for grid when GridAction type', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'grid' } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.cellDrop.subscribe(() => (emitted = true));
    const e = { dataTransfer: { types: [DragDropDataKey.GridActionCol] }, preventDefault: () => {}, stopPropagation: () => {} } as unknown as DragEvent;
    fixture.componentInstance.onHostDrop(e);
    expect(emitted).toBe(true);
  });

  it('onRemove emits removeWidget', () => {
    const fixture = TestBed.createComponent(WidgetRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' });
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.removeWidget.subscribe(() => (emitted = true));
    const e = new Event('click');
    spyOn(e, 'stopPropagation');
    spyOn(e, 'preventDefault');
    fixture.componentInstance.onRemove(e);
    expect(emitted).toBe(true);
  });
});
