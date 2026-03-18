import { TestBed } from '@angular/core/testing';
import { WidgetCheckboxComponent } from './widget-checkbox.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetCheckboxComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetCheckboxComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetCheckboxComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'checkbox', label: 'Check' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetCheckboxComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'checkbox', innerClassName: 'cb-class' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('cb-class');
  });

  it('onLabelInput emits labelChange', () => {
    const fixture = TestBed.createComponent(WidgetCheckboxComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'checkbox' } as WidgetInstance);
    fixture.detectChanges();
    let value = '';
    fixture.componentInstance.labelChange.subscribe((v: string) => (value = v));
    fixture.componentInstance.onLabelInput('New label');
    expect(value).toBe('New label');
  });
});
