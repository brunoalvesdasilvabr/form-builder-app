/** Slugifies a string for use as form/layout name (e.g. in data-form-group). */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'form';
}
