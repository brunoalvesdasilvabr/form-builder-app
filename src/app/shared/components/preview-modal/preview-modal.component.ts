import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PreviewModalData {
  title?: string;
  html: string;
}

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './preview-modal.component.html',
  styleUrl: './preview-modal.component.scss',
})
export class PreviewModalComponent {
  private readonly dialogRef: MatDialogRef<PreviewModalComponent> = inject(MatDialogRef<PreviewModalComponent>);
  private readonly sanitizer = inject(DomSanitizer);
  readonly data = inject<PreviewModalData>(MAT_DIALOG_DATA);

  get title(): string {
    return this.data?.title ?? 'Preview';
  }

  get html(): string {
    return this.data?.html ?? '';
  }

  /** Sanitized HTML for rendering the layout preview. */
  get sanitizedHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.html);
  }

  close(): void {
    this.dialogRef.close();
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.html).catch(() => {});
  }
}
