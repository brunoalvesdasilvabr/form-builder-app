import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface LayoutNameDialogData {
  title?: string;
  defaultValue?: string;
  layoutId?: string | null;
}

@Component({
  selector: 'app-layout-name-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './layout-name-dialog.component.html',
  styleUrl: './layout-name-dialog.component.scss',
})
export class LayoutNameDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<LayoutNameDialogComponent>);
  readonly data = inject<LayoutNameDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly name = signal(this.data?.defaultValue?.trim() ?? '');

  get title(): string {
    return this.data?.title ?? 'Save layout';
  }

  onNameInput(value: string): void {
    this.name.set(value);
  }

  save(): void {
    this.dialogRef.close({
      name: this.name().trim() || 'Untitled',
      layoutId: this.data?.layoutId ?? null,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
