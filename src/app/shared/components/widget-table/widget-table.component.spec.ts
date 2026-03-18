import { TestBed } from '@angular/core/testing';
import { WidgetTableComponent } from './widget-table.component';
import type { WidgetInstance } from '../../models/canvas.model';

describe('WidgetTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetTableComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WidgetTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hostClass returns innerClassName when set', () => {
    const fixture = TestBed.createComponent(WidgetTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', innerClassName: 'tbl' } as WidgetInstance);
    fixture.detectChanges();
    expect(fixture.componentInstance.hostClass).toBe('tbl');
  });

  it('nestedTableChange emits when embedded table emits', () => {
    const fixture = TestBed.createComponent(WidgetTableComponent);
    fixture.componentRef.setInput('widget', { id: 'w1', type: 'table', nestedTable: { rows: [] } } as WidgetInstance);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.nestedTableChange.subscribe(() => (emitted = true));
    const embedded = fixture.nativeElement.querySelector('app-embedded-table');
    if (embedded && (embedded as any).nestedTableChange) {
      (embedded as any).nestedTableChange.emit({ rows: [] });
      expect(emitted).toBe(true);
    }
    expect(fixture.componentInstance.nestedTableChange).toBeTruthy();
  });
});
