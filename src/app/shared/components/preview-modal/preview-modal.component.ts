import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PreviewModalData {
  title?: string;
  html: string;
}

/** Wraps form HTML in a full document for iframe – avoids parent-DOM quirks that can hide rows. */
function toPreviewDocument(html: string): string {
  if (!html?.trim()) return '';
  const style = `body{margin:0;padding:1rem;font:16px system-ui,sans-serif;background:#f5f5f7}
.canvas-table{width:100%;table-layout:fixed;border-collapse:collapse;background:#fafafa;border-radius:8px}
.canvas-cell,.embedded-cell{min-width:0;padding:.5rem;vertical-align:top;border:1px solid #e0e0e4;background:#fafafa}
.embedded-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.85rem}
.embedded-table td{min-height:44px;padding:.35rem;border:1px solid #e0e0e4}
app-widget-renderer,app-widget-input,app-widget-checkbox,app-widget-radio,app-widget-label,app-widget-table,app-widget-cell-renderer,app-widget-grid,app-widget-panel{display:block}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${html}</body></html>`;
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

  /** Full document for iframe srcdoc – renders in isolation so all rows/columns show correctly. */
  readonly previewDoc = computed(() => toPreviewDocument(this.html ?? ''));

  get sanitizedSrcdoc(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.previewDoc());
  }

  close(): void {
    this.dialogRef.close();
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.html).catch(() => {});
  }
}
