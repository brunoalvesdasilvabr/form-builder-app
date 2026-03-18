import { TestBed } from '@angular/core/testing';
import { WidgetLabelComponent } from './widget-label.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetLabelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetLabelComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetLabelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', label: 'Label' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetLabelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', innerClassName: 'custom' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('custom');
  });

  it('onLabelInput emits labelChange with element text content', () => {
    const fixture = TestBed.createComponent(WidgetLabelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', label: 'Label' } as WidgetInstance);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label[contenteditable="true"]');
    label!.textContent = ' New text ';
    let value = '';
    fixture.componentInstance.labelChange.subscribe((v: string) => (value = v));
    fixture.componentInstance.onLabelInput(new Event('input'));
    expect(value).toBe('New text');
  });

  it('onLabelBlur emits labelChange with trimmed text from event target', () => {
    const fixture = TestBed.createComponent(WidgetLabelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'label', label: 'Label' } as WidgetInstance);
    fixture.detectChanges();
    let value = '';
    fixture.componentInstance.labelChange.subscribe((v: string) => (value = v));
    const el = document.createElement('label');
    el.textContent = ' Blur text ';
    fixture.componentInstance.onLabelBlur({ target: el } as unknown as FocusEvent);
    expect(value).toBe('Blur text');
  });
});
