import { TestBed } from '@angular/core/testing';
import { LayoutNameDialogComponent, LayoutNameDialogData } from './layout-name-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DEFAULT_LAYOUT_NAME } from '../../constants/canvas.constants';

describe('LayoutNameDialogComponent', () => {
  const mockDialogRef = { close: jasmine.createSpy('close') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutNameDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('title returns data.title when provided', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { title: 'Custom Title' } as LayoutNameDialogData });
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.title).toBe('Custom Title');
  });

  it('title returns Save when data not provided', () => {
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    expect(fixture.componentInstance.title).toBe('Save');
  });

  it('onNameInput updates name signal', () => {
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    fixture.componentInstance.onNameInput('  my layout  ');
    expect(fixture.componentInstance.name()).toBe('  my layout  ');
  });

  it('save closes with trimmed name and layoutId', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { defaultValue: 'x', layoutId: 'id1' } });
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.name.set('  saved  ');
    fixture.componentInstance.save();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ name: 'saved', layoutId: 'id1' });
  });

  it('save uses DEFAULT_LAYOUT_NAME when name empty', () => {
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    fixture.componentInstance.name.set('   ');
    fixture.componentInstance.save();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ name: DEFAULT_LAYOUT_NAME, layoutId: null });
  });

  it('cancel closes with no argument', () => {
    const fixture = TestBed.createComponent(LayoutNameDialogComponent);
    fixture.componentInstance.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
