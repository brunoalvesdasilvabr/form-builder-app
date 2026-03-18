import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseWidgetComponent } from './base-widget.component';
import type { WidgetInstance } from '../models/canvas.model';

/** Concrete test subclass to test abstract BaseWidgetComponent */
@Component({
  selector: 'app-test-widget',
  standalone: true,
  template: '',
})
class TestWidgetComponent extends BaseWidgetComponent {
  override readonly widget = input.required<WidgetInstance>();
}

describe('BaseWidgetComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestWidgetComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TestWidgetComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('getElementClassObj returns object from util for given key', () => {
    const fixture = TestBed.createComponent(TestWidgetComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    const result = comp.getElementClassObj('label');
    expect(result).toEqual(jasmine.any(Object));
  });

  it('getPropertyBinding returns null for undefined binding', () => {
    const fixture = TestBed.createComponent(TestWidgetComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label' } as WidgetInstance);
    fixture.detectChanges();
    expect(comp.getPropertyBinding(undefined)).toBeNull();
  });

  it('getPropertyBinding returns parsed property for template binding string', () => {
    const fixture = TestBed.createComponent(TestWidgetComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', valueBinding: '{{ listValue1 }}' } as WidgetInstance);
    fixture.detectChanges();
    expect(comp.getPropertyBinding('{{ listValue1 }}')).toBe('listValue1');
  });
});
