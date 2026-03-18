import { generateId } from './id.util';

describe('id.util', () => {
  it('generates a string with default prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^id-\d+-[a-z0-9]+$/);
  });

  it('generates a string with custom prefix', () => {
    const id = generateId('layout');
    expect(id).toMatch(/^layout-\d+-[a-z0-9]+$/);
  });

  it('generates unique ids', () => {
    const a = generateId('x');
    const b = generateId('x');
    expect(a).not.toBe(b);
  });
});
