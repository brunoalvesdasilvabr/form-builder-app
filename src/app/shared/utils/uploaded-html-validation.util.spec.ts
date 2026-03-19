import {
  hasLoneUtf16Surrogates,
  validateUploadedHtmlDocument,
  extractCanvasStateFromUploadedHtml,
  resetUploadHtmlValidatorForTests,
} from './uploaded-html-validation.util';
import { FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID } from '../constants/canvas.constants';

describe('uploaded-html-validation.util', () => {
  afterEach(() => {
    resetUploadHtmlValidatorForTests();
  });

  describe('hasLoneUtf16Surrogates', () => {
    it('returns false for empty and ASCII', () => {
      expect(hasLoneUtf16Surrogates('')).toBe(false);
      expect(hasLoneUtf16Surrogates('<html></html>')).toBe(false);
    });

    it('returns false for valid surrogate pair', () => {
      expect(hasLoneUtf16Surrogates('\uD83D\uDE00')).toBe(false);
    });

    it('returns true for lone high surrogate', () => {
      expect(hasLoneUtf16Surrogates('\uD800')).toBe(true);
    });

    it('returns true for lone low surrogate', () => {
      expect(hasLoneUtf16Surrogates('\uDC00')).toBe(true);
    });
  });

  describe('validateUploadedHtmlDocument', () => {
    function minimalValidDoc(bodyInner: string): string {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${bodyInner}</body></html>`;
    }

    it('returns ok for well-formed document with script', () => {
      const state = { rows: [] };
      const html = minimalValidDoc(
        `<script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">${JSON.stringify(state)}</script>`
      );
      const result = validateUploadedHtmlDocument(html, 'test.html');
      expect(result.ok).toBe(true);
    });

    it('returns not ok for ill-formed UTF-16', () => {
      const result = validateUploadedHtmlDocument('\uD800', 'bad.html');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.summary).toContain('Unicode');
      }
    });

    it('returns not ok for malformed markup (broken attribute value)', () => {
      const html =
        '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div title="a"b"></div></body></html>';
      const result = validateUploadedHtmlDocument(html, 'bad.html');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.details.length > 0 || result.summary.length > 0).toBe(true);
      }
    });
  });

  describe('extractCanvasStateFromUploadedHtml', () => {
    it('returns null when script missing', () => {
      expect(extractCanvasStateFromUploadedHtml('<html><body></body></html>')).toBeNull();
    });

    it('returns null when JSON invalid', () => {
      const html = `<html><body><script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">not json</script></body></html>`;
      expect(extractCanvasStateFromUploadedHtml(html)).toBeNull();
    });

    it('returns null when rows is not an array', () => {
      const html = `<html><body><script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">{"rows":null}</script></body></html>`;
      expect(extractCanvasStateFromUploadedHtml(html)).toBeNull();
    });

    it('returns state when valid', () => {
      const state = { rows: [{ id: 'r0', cells: [] }] };
      const html = `<html><body><script id="${FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID}" type="application/json">${JSON.stringify(state)}</script></body></html>`;
      expect(extractCanvasStateFromUploadedHtml(html)).toEqual(state);
    });
  });
});
