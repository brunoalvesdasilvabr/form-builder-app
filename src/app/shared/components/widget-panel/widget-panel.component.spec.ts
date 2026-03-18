import { TestBed } from '@angular/core/testing';
import { WidgetPanelComponent } from './widget-panel.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetPanelComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetPanelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'panel' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetPanelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'panel', innerClassName: 'panel-class' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('panel-class');
  });

  it('hostClass returns empty string when innerClassName not set', () => {
    const fixture = TestBed.createComponent(WidgetPanelComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'panel' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('');
  });
});
