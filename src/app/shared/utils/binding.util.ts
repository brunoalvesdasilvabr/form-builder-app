/** Extracts property name from "{{ propName }}" binding string. Returns empty string if not a valid binding. */
export function parseBindingProperty(binding: string | undefined): string {
  if (!binding) return '';
  const m = binding.match(/^\{\{\s*(\S+)\s*\}\}$/);
  return m ? m[1] : '';
}
