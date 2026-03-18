import { TestBed } from '@angular/core/testing';
import { PaletteComponent } from './palette.component';
import { DragDropDataKey } from '../../../../shared/constants/drag-drop.constants';
import { LayoutAction } from '../../../../shared/enums';

describe('PaletteComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaletteComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('iconFor returns icon for known type', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    expect(fixture.componentInstance.iconFor('input')).toBeTruthy();
    expect(fixture.componentInstance.iconFor('label')).toBeTruthy();
  });

  it('iconFor returns ? for unknown type', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    expect(fixture.componentInstance.iconFor('unknown' as any)).toBe('?');
  });

  it('onWidgetDragStart sets dataTransfer and adds class when target is HTMLElement', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const div = document.createElement('div');
    const dataTransfer = { effectAllowed: '', setData: jasmine.createSpy() };
    const e = { dataTransfer, target: div } as unknown as DragEvent;
    fixture.componentInstance.onWidgetDragStart(e, 'input');
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(dataTransfer.setData).toHaveBeenCalledWith(DragDropDataKey.WidgetType, 'input');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'input');
    expect(div.classList.contains('palette-item-dragging')).toBe(true);
  });

  it('onWidgetDragStart does nothing when dataTransfer is null', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const e = { dataTransfer: null, target: document.createElement('div') } as unknown as DragEvent;
    expect(() => fixture.componentInstance.onWidgetDragStart(e, 'input')).not.toThrow();
  });

  it('onLayoutActionDragStart sets data for Row action', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const div = document.createElement('div');
    const dataTransfer = { effectAllowed: '', setData: jasmine.createSpy() };
    const e = { dataTransfer, target: div } as unknown as DragEvent;
    fixture.componentInstance.onLayoutActionDragStart(e, LayoutAction.Row);
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', LayoutAction.Row);
  });

  it('onGridActionDragStart sets data and adds class', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const div = document.createElement('div');
    const dataTransfer = { effectAllowed: '', setData: jasmine.createSpy() };
    const e = { dataTransfer, target: div } as unknown as DragEvent;
    fixture.componentInstance.onGridActionDragStart(e, 'col');
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(div.classList.contains('palette-item-dragging')).toBe(true);
  });

  it('onDragEnd removes palette-item-dragging class', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const div = document.createElement('div');
    div.classList.add('palette-item-dragging');
    const e = { target: div } as unknown as DragEvent;
    fixture.componentInstance.onDragEnd(e);
    expect(div.classList.contains('palette-item-dragging')).toBe(false);
  });

  it('labels signal returns WIDGET_LABELS', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    expect(fixture.componentInstance.labels()).toBeTruthy();
    expect(fixture.componentInstance.labels()['input']).toBe('Input');
  });
});
