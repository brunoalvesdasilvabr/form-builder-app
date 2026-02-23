/** Generates a unique id. Optional prefix for namespacing (e.g. "id", "layout", "nested"). */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
