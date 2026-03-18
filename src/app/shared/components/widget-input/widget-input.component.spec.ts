import { TestBed } from '@angular/core/testing';
import { WidgetInputComponent } from './widget-input.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetInputComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetInputComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetInputComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetInputComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input', innerClassName: 'my-class' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('my-class');
  });

  it('hostClass returns empty string when innerClassName not set', () => {
    const fixture = TestBed.createComponent(WidgetInputComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('');
  });

  it('onInput emits valueChange', () => {
    const fixture = TestBed.createComponent(WidgetInputComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input' } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.valueChange.subscribe(() => (emitted = true));
    fixture.componentInstance.onInput();
    expect(emitted).toBe(true);
  });

  it('renders input with placeholder from widget', () => {
    const fixture = TestBed.createComponent(WidgetInputComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'input', placeholder: 'Enter text...' } as WidgetInstance);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(input?.getAttribute('placeholder')).toBe('Enter text...');
  });
});
