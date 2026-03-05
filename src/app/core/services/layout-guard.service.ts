import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { LayoutNameDialogComponent } from '../../shared/components/layout-name-dialog/layout-name-dialog.component';
import { SavedLayoutsService } from './saved-layouts.service';
import { CanvasService } from './canvas.service';

/**
 * Prompts the user to save the layout name before opening the right panel for form controls.
 * The layout name is used as the form reference (e.g. layoutName.controlName.invalid) in visibility conditions.
 */
@Injectable({ providedIn: 'root' })
export class LayoutGuardService {
  private readonly dialog = inject(MatDialog);
  private readonly savedLayouts = inject(SavedLayoutsService);
  private readonly canvas = inject(CanvasService);

  /** Returns true if layout is named (or user saved). False if user cancelled. */
  async ensureLayoutNamed(): Promise<boolean> {
    const layout = this.savedLayouts.selectedLayout();
    const name = layout?.name?.trim() ?? '';
    const isNamed = name.length > 0 && name.toLowerCase() !== 'untitled';
    if (isNamed) return true;

    const dialogRef = this.dialog.open(LayoutNameDialogComponent, {
      data: {
        title: 'Please enter layout name',
        defaultValue: name || (layout?.name ?? ''),
        layoutId: layout?.id ?? null,
      },
      width: '400px',
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return false;

    const state = this.canvas.getState();
    const trimmedName = result.name.trim() || 'Untitled';
    if (result.layoutId) {
      this.savedLayouts.updateLayout(result.layoutId, state, trimmedName);
    } else {
      this.savedLayouts.addLayout(trimmedName, state);
    }
    return true;
  }

  /** True if layout is selected and has a non-empty, non-"Untitled" name */
  hasLayoutNamed(): boolean {
    const layout = this.savedLayouts.selectedLayout();
    const name = layout?.name?.trim() ?? '';
    return name.length > 0 && name.toLowerCase() !== 'untitled';
  }
}
