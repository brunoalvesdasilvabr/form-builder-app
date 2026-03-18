import { parseBindingProperty } from './binding.util';

describe('binding.util', () => {
  it('extracts path from {{ path }} form', () => {
    expect(parseBindingProperty('{{ foo.bar }}')).toBe('foo.bar');
    expect(parseBindingProperty('{{ x }}')).toBe('x');
  });

  it('returns plain path trimmed when no braces', () => {
    expect(parseBindingProperty('foo.bar')).toBe('foo.bar');
    expect(parseBindingProperty('  path  ')).toBe('path');
  });

  it('returns empty string for empty/undefined/non-string', () => {
    expect(parseBindingProperty('')).toBe('');
    expect(parseBindingProperty(undefined)).toBe('');
    expect(parseBindingProperty(null as any)).toBe('');
  });
});
