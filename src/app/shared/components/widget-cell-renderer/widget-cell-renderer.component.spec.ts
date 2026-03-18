import { TestBed } from '@angular/core/testing';
import { WidgetCellRendererComponent } from './widget-cell-renderer.component';
import type { WidgetInstance } from '../../models/canvas.model';
import { DragDropDataKey } from '../../constants/drag-drop.constants';

describe('WidgetCellRendererComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetCellRendererComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hasWidgetCellClass is true', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' });
    fixture.detectChanges();
    expect(fixture.componentInstance.hasWidgetCellClass).toBe(true);
  });

  it('draggable is true when cellId set', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' });
    fixture.componentRef.setInput('cellId', 'c1');
    fixture.detectChanges();
    expect(fixture.componentInstance.draggable).toBe('true');
  });

  it('onDragStart sets dataTransfer with NestedMove', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' });
    fixture.componentRef.setInput('cellId', 'c1');
    fixture.detectChanges();
    const setData = jasmine.createSpy();
    const e = { dataTransfer: { effectAllowed: '', setData } } as unknown as DragEvent;
    fixture.componentInstance.onDragStart(e);
    expect(setData).toHaveBeenCalledWith(DragDropDataKey.NestedMove, jasmine.any(String));
    expect(fixture.componentInstance.isDragging).toBe(true);
  });

  it('onDragEnd sets isDragging false', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' });
    fixture.componentRef.setInput('cellId', 'c1');
    fixture.detectChanges();
    const e = { dataTransfer: { setData: () => {} } } as unknown as DragEvent;
    fixture.componentInstance.onDragStart(e);
    fixture.componentInstance.onDragEnd();
    expect(fixture.componentInstance.isDragging).toBe(false);
  });

  it('onRemove emits removeWidget', () => {
    const fixture = TestBed.createComponent(WidgetCellRendererComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' });
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
