import { Injectable, signal, computed } from '@angular/core';
import type { CanvasState } from '../../shared/models/canvas.model';
import { generateId } from '../../shared/utils/id.util';

export interface SavedLayout {
  id: string;
  name: string;
  state: CanvasState;
  updatedAt: number;
}

const STORAGE_KEY = 'form-builder-saved-layouts';

@Injectable({ providedIn: 'root' })
export class SavedLayoutsService {
  private readonly layoutsSignal = signal<SavedLayout[]>([]);
  private readonly selectedIdSignal = signal<string | null>(null);

  readonly layouts = this.layoutsSignal.asReadonly();
  readonly selectedLayoutId = this.selectedIdSignal.asReadonly();

  readonly selectedLayout = computed(() => {
    const id = this.selectedLayoutId();
    const list = this.layoutsSignal();
    if (!id) return null;
    return list.find((l) => l.id === id) ?? null;
  });

  readonly hasLayouts = computed(() => this.layoutsSignal().length > 0);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedLayout[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.layoutsSignal.set(parsed);
      }
    } catch {
      // ignore invalid data
    }
  }

  private saveToStorage(): void {
    try {
      const list = this.layoutsSignal();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore quota / storage errors
    }
  }

  addLayout(name: string, state: CanvasState): SavedLayout {
    const trimmed = name.trim() || 'Untitled';
    const layout: SavedLayout = {
      id: generateId('layout'),
      name: trimmed,
      state: JSON.parse(JSON.stringify(state)),
      updatedAt: Date.now(),
    };
    this.layoutsSignal.update((list) => [...list, layout]);
    this.selectedIdSignal.set(layout.id);
    this.saveToStorage();
    return layout;
  }

  updateLayout(id: string, state: CanvasState, name?: string): void {
    this.layoutsSignal.update((list) =>
      list.map((l) =>
        l.id === id
          ? {
              ...l,
              name: name != null ? (name.trim() || 'Untitled') : l.name,
              state: JSON.parse(JSON.stringify(state)),
              updatedAt: Date.now(),
            }
          : l
      )
    );
    this.saveToStorage();
  }

  removeLayout(id: string): void {
    this.layoutsSignal.update((list) => list.filter((l) => l.id !== id));
    if (this.selectedIdSignal() === id) {
      this.selectedIdSignal.set(null);
    }
    this.saveToStorage();
  }

  selectLayout(id: string | null): void {
    this.selectedIdSignal.set(id);
  }

  getLayoutById(id: string): SavedLayout | null {
    return this.layoutsSignal().find((l) => l.id === id) ?? null;
  }
}
