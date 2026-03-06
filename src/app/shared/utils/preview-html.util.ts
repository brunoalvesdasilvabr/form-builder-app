/**
 * Strips builder UI chrome from a cloned canvas DOM so the result
 * is suitable for preview or export (clean form layout only).
 * Reusable for preview modal, save/export, etc.
 */
const BUILDER_ELEMENT_SELECTORS = [
  '.canvas-toolbar',
  '.canvas-table-toolbar',
  '.embedded-sidebar',
  '.widget-remove',
  '.widget-cell-remove',
  '.widget-radio-option-add',
  '.widget-radio-option-remove',
  '.canvas-cell-placeholder', /* "Drop component" in empty cells – not shown in preview/download */
] as const;

const OUTLINE_CLASSES_TO_STRIP = [
  'canvas-cell-selected',
  'canvas-cell-drag-over',
  'embedded-cell-selected',
  'embedded-cell-drag-over',
] as const;

const ANGULAR_ATTR_PATTERN = /^(_ngcontent|_nghost|ng-reflect|ng-version|ng-)[-_a-z0-9.]*$/i;

/**
 * Removes Angular-specific attributes (e.g. _ngcontent-*, _nghost-*, ng-reflect-*).
 * Keeps ng-* classes to preserve layout. Mutates the root in place.
 */
function stripAngularAttributes(root: HTMLElement): void {
  const walk = (el: Element) => {
    el.getAttributeNames().forEach((name) => {
      if (ANGULAR_ATTR_PATTERN.test(name) || name.startsWith('_ng')) el.removeAttribute(name);
    });
    Array.from(el.children).forEach((child) => walk(child));
  };
  walk(root);
}

/**
 * Copies form control values from source to clone (cloneNode does not copy input values).
 * Mutates the clone in place. Reusable.
 */
export function copyFormValues(source: HTMLElement, clone: HTMLElement): void {
  const srcInputs = Array.from(source.querySelectorAll<HTMLInputElement>('input, textarea'));
  const cloneInputs = Array.from(clone.querySelectorAll<HTMLInputElement>('input, textarea'));
  cloneInputs.forEach((input, i) => {
    const src = srcInputs[i];
    if (src && (input.type === 'text' || input.type === 'checkbox' || input.type === 'radio' || input.tagName === 'TEXTAREA')) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = src.checked;
      }
      input.value = src.value;
      // Do not set value attribute: consumer binds via data-property-binding.
    }
  });
}

/**
 * Removes builder-only elements, outline/selection classes, and cleans placeholders.
 * Mutates the clone in place.
 * @param clone - The cloned DOM to clean
 * @param options.stripAngular - If false, keeps Angular attributes so component styles still match in-preview (default: true)
 */
export function stripBuilderChrome(clone: HTMLElement, options?: { stripAngular?: boolean }): void {
  BUILDER_ELEMENT_SELECTORS.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  const all = clone.querySelectorAll('*');
  all.forEach((el) => {
    const htmlEl = el as HTMLElement;
    OUTLINE_CLASSES_TO_STRIP.forEach((cls) => htmlEl.classList.remove(cls));
  });

  // Disable drag and drop
  clone.querySelectorAll('[draggable="true"]').forEach((el) => {
    (el as HTMLElement).setAttribute('draggable', 'false');
  });

  // Remove value attribute from text-like inputs; consumer binds via data-property-binding.
  clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[type="text"], input[type="email"], input[type="number"], input:not([type]), textarea'
  ).forEach((el) => el.removeAttribute('value'));

  // Remove Angular attributes only when requested (e.g. for export). When false, keep them so
  // component styles (which use [_ngcontent-*] selectors) still match in-preview.
  if (options?.stripAngular !== false) {
    stripAngularAttributes(clone);
  }
}

/** Component tag names to unwrap for publish (keep layout + native elements only). */
const PUBLISH_UNWRAP_TAGS = [
  "app-widget-input",
  "app-widget-checkbox",
  "app-widget-radio",
  "app-widget-label",
  "app-widget-cell-renderer",
  "app-embedded-table",
  "app-widget-table",
  "app-widget-grid",
  "app-widget-renderer",
] as const;

/**
 * Unwraps component wrapper elements so only their inner content (inputs, labels, etc.) remains.
 * Mutates the root in place. Process innermost first so nested components are fully flattened.
 */
export function stripComponentWrappers(root: HTMLElement): void {
  const tags = new Set(PUBLISH_UNWRAP_TAGS);
  const getDepth = (el: Element, top: Element): number => {
    let d = 0;
    let cur: Element | null = el;
    while (cur && cur !== top) {
      d++;
      cur = cur.parentElement;
    }
    return d;
  };

  let found: Element[];
  do {
    found = Array.from(root.querySelectorAll("*")).filter((el) =>
      tags.has(el.tagName.toLowerCase() as (typeof PUBLISH_UNWRAP_TAGS)[number])
    );
    found.sort((a, b) => getDepth(b, root) - getDepth(a, root));
    for (const el of found) {
      const parent = el.parentElement;
      if (!parent) continue;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      el.remove();
    }
  } while (found.length > 0);
}
