import { HtmlValidate, StaticConfigLoader } from 'html-validate/browser';
import type { CanvasState } from '../models/canvas.model';
import { FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID } from '../constants/canvas.constants';

/**
 * Minimal syntax-only validation: well-formed markup, encoding-ish issues, and
 * parser/token errors. No WCAG, no required &lt;title&gt;/&lt;lang&gt;, no
 * “permitted parent/content” content-model rules, no accessibility rules.
 *
 * Enabled rules: tag/close order, duplicate attributes, unknown element names,
 * bad character references, raw `&lt;`/`&amp;` in text (relaxed), implicit-close
 * mistakes. Tokenizer/parser failures still surface as `parser-error`.
 */
function createUploadHtmlValidator(): HtmlValidate {
  const loader = new StaticConfigLoader({
    root: true,
    extends: [],
    elements: ['html5'],
    rules: {
      'close-order': 'error',
      'close-attr': 'error',
      'no-implicit-close': 'error',
      'no-dup-attr': 'error',
      'element-name': 'error',
      'unrecognized-char-ref': 'error',
      'no-raw-characters': ['error', { relaxed: true }],
    },
  });
  return new HtmlValidate(loader);
}

let validatorSingleton: HtmlValidate | null = null;

function getValidator(): HtmlValidate {
  if (!validatorSingleton) {
    validatorSingleton = createUploadHtmlValidator();
  }
  return validatorSingleton;
}

/** Resets cached validator (tests). */
export function resetUploadHtmlValidatorForTests(): void {
  validatorSingleton = null;
}

/**
 * True if the string contains ill-formed UTF-16 (lone surrogate code units).
 * FileReader/TextDecoder typically avoids this, but raw buffers might not.
 */
export function hasLoneUtf16Surrogates(content: string): boolean {
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = content.charCodeAt(i + 1);
      if (i + 1 >= content.length || next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

export type UploadedHtmlValidationResult =
  | { ok: true }
  | { ok: false; summary: string; details: string[] };

/**
 * Validates uploaded HTML for basic syntax / encoding (html-validate + UTF-16
 * surrogate check). Does not enforce document semantics or accessibility.
 * Synchronous (`HtmlValidate#validateStringSync`) so callers are not
 * subject to microtask ordering vs Angular test `whenStable()`.
 * Does not extract layout JSON — use {@link extractCanvasStateFromUploadedHtml} after this passes.
 */
export function validateUploadedHtmlDocument(
  html: string,
  filename = 'upload.html'
): UploadedHtmlValidationResult {
  if (hasLoneUtf16Surrogates(html)) {
    return {
      ok: false,
      summary: 'The file is not valid Unicode text (invalid UTF-16 surrogate pairs).',
      details: [],
    };
  }
  try {
    const validator = getValidator();
    const report = validator.validateStringSync(html, filename);
    if (report.valid) {
      return { ok: true };
    }
    const details: string[] = [];
    for (const result of report.results) {
      for (const msg of result.messages) {
        details.push(`Line ${msg.line}, column ${msg.column}: ${msg.message} [${msg.ruleId}]`);
      }
    }
    const summary =
      details[0] ?? 'The file is not valid HTML according to the configured rules.';
    return { ok: false, summary, details };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: 'Could not validate HTML.',
      details: [message],
    };
  }
}

/**
 * Reads canvas layout state from HTML produced by this app (script#form-builder-layout-state).
 */
export function extractCanvasStateFromUploadedHtml(html: string): CanvasState | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const script = doc.getElementById(FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID);
    if (!script?.textContent?.trim()) {
      return null;
    }
    const state = JSON.parse(script.textContent) as { rows?: unknown[] };
    if (!state || !Array.isArray(state.rows)) {
      return null;
    }
    return state as CanvasState;
  } catch {
    return null;
  }
}
