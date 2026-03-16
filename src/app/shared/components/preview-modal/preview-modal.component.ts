import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PreviewModalData {
  title?: string;
  html: string;
}

/** Wraps form HTML in a full document for iframe. Styles match the canvas drop area so preview looks the same. */
function toPreviewDocument(html: string): string {
  if (!html?.trim()) return '';
  const style = `body{margin:0;padding:1rem;font:16px system-ui,sans-serif;background:#f5f5f7;box-sizing:border-box;color:#1a1a1e}
*{box-sizing:border-box}
.canvas-table{width:100%;table-layout:fixed;border-collapse:collapse;background:#f5f5f7;border-radius:8px;overflow:hidden}
.canvas-cell{min-width:0;width:1%;min-height:60px;padding:0;vertical-align:top;border:1px solid #e0e0e4;background:#fafafa;overflow:hidden}
.canvas-cell>*{display:block;width:100%;min-width:0;overflow:hidden}
.embedded-cell{min-width:0;padding:.35rem;vertical-align:top;border:1px solid #e0e0e4;background:#fafafa}
.embedded-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.85rem}
.embedded-table td{min-height:44px;padding:.35rem;border:1px solid #e0e0e4}
app-widget-renderer,app-widget-input,app-widget-checkbox,app-widget-radio,app-widget-label,app-widget-table,app-widget-cell-renderer,app-widget-grid,app-widget-panel{display:block;padding:0.5rem;min-height:2rem;box-sizing:border-box}
.widget-input-control{display:block;width:100%;box-sizing:border-box;padding:0.45rem 0.6rem;background:#f5f5f7;border:1px solid #e0e0e4;border-radius:6px;color:#1a1a1e;font:inherit}
.widget-input-control::placeholder{color:#6b7280}
.widget-label-control{display:block;font-size:0.8rem;color:#1a1a1e;font-weight:500;padding:0.35rem 0.5rem;background:transparent;border:1px solid transparent;border-radius:4px;width:100%;min-height:1.5em}`;
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
