import { toSafeFilename } from './safe-filename.util';

describe('safe-filename.util', () => {
  it('returns fallback for null/undefined', () => {
    expect(toSafeFilename(null)).toBe('canvas');
    expect(toSafeFilename(undefined)).toBe('canvas');
  });

  it('returns fallback for empty or whitespace', () => {
    expect(toSafeFilename('')).toBe('canvas');
    expect(toSafeFilename('   ')).toBe('canvas');
  });

  it('uses custom fallback', () => {
    expect(toSafeFilename(null, 'custom')).toBe('custom');
  });

  it('replaces invalid chars with hyphen', () => {
    expect(toSafeFilename('My Form')).toBe('My-Form');
    expect(toSafeFilename('a.b_c-d')).toBe('a-b_c-d');
  });

  it('trims and then replaces', () => {
    expect(toSafeFilename('  x y  ')).toBe('x-y');
  });
});
