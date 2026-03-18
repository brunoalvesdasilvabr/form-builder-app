import { TestBed } from '@angular/core/testing';
import { LayoutGuardService } from './layout-guard.service';
import { MatDialog } from '@angular/material/dialog';
import { SavedLayoutsService, SavedLayout } from './saved-layouts.service';
import { CanvasService } from './canvas.service';
import { of } from 'rxjs';
import { DEFAULT_LAYOUT_NAME } from '../../shared/constants/canvas.constants';

const stubLayout = (overrides: Partial<SavedLayout>): SavedLayout => ({
  id: '',
  name: '',
  state: { rows: [] },
  updatedAt: 0,
  ...overrides,
});

describe('LayoutGuardService', () => {
  let service: LayoutGuardService;
  let dialog: jasmine.SpyObj<MatDialog>;
  let savedLayouts: jasmine.SpyObj<SavedLayoutsService>;
  let canvas: jasmine.SpyObj<CanvasService>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    savedLayouts = jasmine.createSpyObj('SavedLayoutsService', ['addLayout', 'updateLayout', 'selectedLayout']);
    savedLayouts.selectedLayout.and.returnValue(null);
    canvas = jasmine.createSpyObj('CanvasService', ['getStateForSave']);
    TestBed.configureTestingModule({
      providers: [
        LayoutGuardService,
        { provide: MatDialog, useValue: dialog },
        { provide: SavedLayoutsService, useValue: savedLayouts },
        { provide: CanvasService, useValue: canvas },
      ],
    });
    service = TestBed.inject(LayoutGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('hasLayoutNamed returns false when no layout', () => {
    savedLayouts.selectedLayout.and.returnValue(null);
    expect(service.hasLayoutNamed()).toBe(false);
  });

  it('hasLayoutNamed returns false when name is default', () => {
    savedLayouts.selectedLayout.and.returnValue(stubLayout({ name: DEFAULT_LAYOUT_NAME }));
    expect(service.hasLayoutNamed()).toBe(false);
  });

  it('hasLayoutNamed returns true when layout has non-default name', () => {
    savedLayouts.selectedLayout.and.returnValue(stubLayout({ name: 'My Layout' }));
    expect(service.hasLayoutNamed()).toBe(true);
  });

  it('ensureLayoutNamed returns true when layout already named', async () => {
    savedLayouts.selectedLayout.and.returnValue(stubLayout({ name: 'Named', id: 'id1' }));
    const result = await service.ensureLayoutNamed();
    expect(result).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('ensureLayoutNamed opens dialog when not named and returns false if user cancels', async () => {
    savedLayouts.selectedLayout.and.returnValue(stubLayout({ name: '', id: '' }));
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    const result = await service.ensureLayoutNamed();
    expect(result).toBe(false);
    expect(dialog.open).toHaveBeenCalled();
  });

  it('ensureLayoutNamed saves and returns true when user submits', async () => {
    savedLayouts.selectedLayout.and.returnValue(stubLayout({ name: '', id: '' }));
    savedLayouts.addLayout = jasmine.createSpy();
    canvas.getStateForSave.and.returnValue({ rows: [] });
    dialog.open.and.returnValue({
      afterClosed: () => of({ name: ' New ', layoutId: null }),
    } as any);
    const result = await service.ensureLayoutNamed();
    expect(result).toBe(true);
    expect(savedLayouts.addLayout).toHaveBeenCalledWith('New', jasmine.any(Object));
  });
});
