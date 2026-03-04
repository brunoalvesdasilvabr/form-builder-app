/** Turns a layout/form name into a safe filename (alphanumeric, hyphens, underscores). */
export function toSafeFilename(name: string | null | undefined, fallback = 'canvas'): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[^a-z0-9-_]/gi, '-') || fallback;
}
