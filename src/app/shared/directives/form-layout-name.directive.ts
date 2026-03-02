import { Directive, effect, ElementRef, inject } from "@angular/core";
import { SavedLayoutsService } from "../../core/services/saved-layouts.service";
import { slugify } from '../utils/slugify.util';

/**
 * Sets the form's data-form-group attribute to the selected layout name (slugified).
 * Uses an effect so it updates when the selected layout changes.
 */
@Directive({
  selector: "form[appFormLayoutName]",
  standalone: true,
})
export class FormLayoutNameDirective {
  private readonly savedLayouts = inject(SavedLayoutsService);
  private readonly el = inject(ElementRef<HTMLFormElement>);

  constructor() {
    effect(() => {
      const name = this.savedLayouts.selectedLayout()?.name?.trim();
      const value = slugify(name ?? "form");
      this.el.nativeElement.setAttribute("data-form-group", value);
    });
  }
}
