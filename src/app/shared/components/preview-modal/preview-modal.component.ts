import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PreviewModalData {
  title?: string;
  html: string;
}

/** Wraps form HTML for iframe. Uses rem so content scales with base font; smaller base makes preview fit popup and match canvas proportions. */
function toPreviewDocument(html: string): string {
  if (!html?.trim()) return '';
  const style = `html{font-size:13px}
*{box-sizing:border-box}
body{margin:0;padding:.75rem;font:1rem system-ui,sans-serif;background:#f5f5f7;color:#1a1a1e;line-height:1.35}
.canvas-content{padding:.75rem}
.canvas-table{width:100%;table-layout:fixed;border-collapse:collapse;background:#fff;border-radius:.5rem;overflow:hidden}
.canvas-cell{min-width:0;width:1%;min-height:2.5rem;padding:0;vertical-align:top;border:1px solid #e0e0e4;background:#fafafa;overflow:hidden}
.canvas-cell>*{display:block;width:100%;min-width:0;overflow:hidden}
.canvas-cell-placeholder{min-height:2.25rem;padding:.4rem .6rem;display:flex;align-items:center;justify-content:center;font-size:.85rem;color:#6b7280}
.embedded-cell{min-width:0;padding:.2rem .3rem;vertical-align:top;border:1px solid #e0e0e4;background:#fafafa}
.embedded-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.9rem}
.embedded-table td{min-height:2rem;padding:.2rem .3rem;border:1px solid #e0e0e4}
app-widget-renderer,app-widget-input,app-widget-checkbox,app-widget-radio,app-widget-label,app-widget-table,app-widget-cell-renderer,app-widget-grid,app-widget-panel{display:block;padding:.25rem .4rem;min-height:1.25rem;box-sizing:border-box}
.widget-input-control{display:block;width:100%;box-sizing:border-box;padding:.25rem .4rem;font-size:.95rem;background:#f5f5f7;border:1px solid #e0e0e4;border-radius:.35rem;color:#1a1a1e}
.widget-input-control::placeholder{color:#6b7280}
.widget-label-control{display:block;font-size:.85rem;color:#1a1a1e;font-weight:500;padding:.2rem .3rem;background:transparent;border:1px solid transparent;border-radius:.25rem;width:100%;min-height:1.3em}
.widget-grid-wrap{padding:.25rem .4rem;box-sizing:border-box}
.widget-grid-table{width:100%;font-size:.9rem}
.mat-mdc-header-row,.mat-mdc-row,.mat-mdc-footer-row{min-height:0}
.mat-mdc-cell,.mat-mdc-header-cell,.mat-mdc-footer-cell{padding:.3rem .5rem;border-color:#e0e0e4;font-size:inherit;line-height:1.3}
.mat-sort-header-arrow,.mat-sort-header-indicator,.mat-sort-header-stem,.mat-sort-header-pointer-left,.mat-sort-header-pointer-right,.mat-sort-header-pointer-middle{display:none !important}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${style}</style></head><body>${html}</body></html>`;
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
