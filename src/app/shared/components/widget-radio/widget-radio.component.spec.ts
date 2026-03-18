import { TestBed } from '@angular/core/testing';
import { WidgetRadioComponent } from './widget-radio.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetRadioComponent', () => {
  const widget: WidgetInstance = { id: 'w1', type: 'radio', label: 'Choose', options: ['A', 'B'] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetRadioComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', { ...widget, innerClassName: 'radio-class' });
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('radio-class');
  });

  it('dataVisibilityCondition returns visibilityCondition from widget', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', { ...widget, visibilityCondition: 'x > 0' });
    fixture.detectChanges();
    expect(fixture.componentInstance.dataVisibilityCondition).toBe('x > 0');
  });

  it('onLabelInput emits labelChange', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let v = '';
    fixture.componentInstance.labelChange.subscribe((x: string) => (v = x));
    fixture.componentInstance.onLabelInput('Label');
    expect(v).toBe('Label');
  });

  it('onOptionChange emits optionsChange with updated array', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let emitted: string[] = [];
    fixture.componentInstance.optionsChange.subscribe((x: string[]) => (emitted = x));
    fixture.componentInstance.onOptionChange(['A', 'B'], 1, 'B2');
    expect(emitted).toEqual(['A', 'B2']);
  });

  it('addOption emits optionsChange with new option appended', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let emitted: string[] = [];
    fixture.componentInstance.optionsChange.subscribe((x: string[]) => (emitted = x));
    fixture.componentInstance.addOption(['A']);
    expect(emitted).toEqual(['A', 'Option 2']);
  });

  it('removeOption emits optionsChange with item removed', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let emitted: string[] = [];
    fixture.componentInstance.optionsChange.subscribe((x: string[]) => (emitted = x));
    fixture.componentInstance.removeOption(['A', 'B'], 0);
    expect(emitted).toEqual(['B']);
  });

  it('removeOption when one left emits at least Option 1', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let emitted: string[] = [];
    fixture.componentInstance.optionsChange.subscribe((x: string[]) => (emitted = x));
    fixture.componentInstance.removeOption(['A'], 0);
    expect(emitted).toEqual(['Option 1']);
  });

  it('onRadioOptionClick emits optionSelect', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    let idx = -1;
    fixture.componentInstance.optionSelect.subscribe((i: number) => (idx = i));
    fixture.componentInstance.onRadioOptionClick(1);
    expect(idx).toBe(1);
  });

  it('getSelectedValue returns empty when not set', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    expect(fixture.componentInstance.getSelectedValue(widget)).toBe('');
  });

  it('onRadioSelect updates selected value and getSelectedValue returns it', () => {
    const fixture = TestBed.createComponent(WidgetRadioComponent);
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    fixture.componentInstance.onRadioSelect(widget, 'A');
    expect(fixture.componentInstance.getSelectedValue(widget)).toBe('A');
  });
});
