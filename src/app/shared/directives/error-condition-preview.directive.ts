import {
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { SavedLayoutsService } from '../../core/services/saved-layouts.service';
import { Subscription } from 'rxjs';

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'form';
}

/**
 * When used inside a form with [formGroup], evaluates data-error-condition on the host
 * and shows/hides the error message so you can test validation in the builder canvas.
 */
@Directive({
  selector: '[appErrorConditionPreview]',
  standalone: true,
})
export class ErrorConditionPreviewDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly savedLayouts = inject(SavedLayoutsService);
  private readonly formGroupDirective = inject(FormGroupDirective, { optional: true });

  private sub?: Subscription;

  ngOnInit(): void {
    if (!this.formGroupDirective?.form) return;
    const form = this.formGroupDirective.form;
    this.updateVisibility(form);
    this.sub = new Subscription();
    this.sub.add(form.valueChanges?.subscribe(() => this.updateVisibility(form)));
    this.sub.add(form.statusChanges?.subscribe(() => this.updateVisibility(form)));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateVisibility(form: { controls: Record<string, unknown> }): void {
    const condition = this.el.nativeElement.getAttribute('data-error-condition');
    if (!condition?.trim()) {
      this.el.nativeElement.style.display = '';
      this.cdr.markForCheck();
      return;
    }
    const layoutName = slugify(this.savedLayouts.selectedLayout()?.name?.trim() ?? 'form');
    try {
      const fn = new Function(layoutName, `return ${condition}`);
      const result = fn(form.controls);
      this.el.nativeElement.style.display = result ? '' : 'none';
    } catch {
      this.el.nativeElement.style.display = '';
    }
    this.cdr.markForCheck();
  }
}
