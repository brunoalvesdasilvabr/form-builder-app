/**
 * Returns the JSON path from a binding.
 * Accepts either "{{ path }}" (template form) or a plain path string (e.g. from saved layout).
 * Returns the path for use in data attributes and saved state; returns '' if binding is empty.
 */
export function parseBindingProperty(binding: string | undefined): string {
  if (!binding || typeof binding !== 'string') return '';
  const m = binding.match(/^\{\{\s*(\S+)\s*\}\}$/);
  return m ? m[1] : binding.trim();
}
