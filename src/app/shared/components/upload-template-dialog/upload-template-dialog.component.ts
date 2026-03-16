import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface UploadTemplateResult {
  content: string;
  fileName: string;
}

const ALLOWED_EXTENSION = '.html';

@Component({
  selector: 'app-upload-template-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './upload-template-dialog.component.html',
  styleUrl: './upload-template-dialog.component.scss',
})
export class UploadTemplateDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UploadTemplateDialogComponent>);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly errorMessage = signal<string | null>(null);

  get selectedFileName(): string {
    const file = this.selectedFile();
    return file?.name ?? '';
  }

  browse(): void {
    this.errorMessage.set(null);
    this.fileInputRef?.nativeElement?.click();
  }

  onFilenameKeydown(e: Event): void {
    const ev = e as KeyboardEvent;
    if (ev.key === ' ') {
      ev.preventDefault();
      this.browse();
    }
  }

  onFileSelected(e: Event): void {
    this.errorMessage.set(null);
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.selectedFile.set(null);
      return;
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (ext !== ALLOWED_EXTENSION) {
      this.errorMessage.set('Invalid file type');
      this.selectedFile.set(null);
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  ok(): void {
    const file = this.selectedFile();
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (ext !== ALLOWED_EXTENSION) {
      this.errorMessage.set('Invalid file type');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      this.dialogRef.close({ content, fileName: file.name } as UploadTemplateResult);
    };
    reader.onerror = () => {
      this.errorMessage.set('Could not read file');
    };
    reader.readAsText(file);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
