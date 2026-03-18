import { TestBed } from '@angular/core/testing';
import { SavedLayoutsService } from './saved-layouts.service';
import type { CanvasState } from '../../shared/models/canvas.model';

describe('SavedLayoutsService', () => {
  let service: SavedLayoutsService;
  const emptyState: CanvasState = { rows: [] };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: SavedLayoutsService, useFactory: () => new SavedLayoutsService() }],
    });
    service = TestBed.inject(SavedLayoutsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('addLayout adds a layout and selects it', () => {
    const layout = service.addLayout('Test Layout', emptyState);
    expect(layout.name).toBe('Test Layout');
    expect(layout.id).toBeTruthy();
    expect(service.selectedLayoutId()).toBe(layout.id);
    expect(service.layouts().length).toBe(1);
    expect(service.selectedLayout()).toEqual(layout);
  });

  it('addLayout trims name and uses default when empty', () => {
    const layout = service.addLayout('   ', emptyState);
    expect(layout.name).toBe('Untitled');
  });

  it('updateLayout updates layout state and optional name', () => {
    const layout = service.addLayout('Original', emptyState);
    const newState: CanvasState = { rows: [{ id: 'r1', cells: [] }] } as CanvasState;
    service.updateLayout(layout.id, newState, 'Updated Name');
    const updated = service.getLayoutById(layout.id);
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.state.rows.length).toBe(1);
  });

  it('removeLayout removes layout and clears selection if selected', () => {
    const layout = service.addLayout('To Remove', emptyState);
    service.removeLayout(layout.id);
    expect(service.layouts().length).toBe(0);
    expect(service.selectedLayoutId()).toBeNull();
  });

  it('selectLayout sets selected id', () => {
    const layout = service.addLayout('A', emptyState);
    service.addLayout('B', emptyState);
    service.selectLayout(service.layouts()[1].id);
    expect(service.selectedLayoutId()).toBe(service.layouts()[1].id);
    service.selectLayout(null);
    expect(service.selectedLayoutId()).toBeNull();
  });

  it('getLayoutById returns layout or null', () => {
    const layout = service.addLayout('X', emptyState);
    expect(service.getLayoutById(layout.id)).toEqual(layout);
    expect(service.getLayoutById('nonexistent')).toBeNull();
  });
});
