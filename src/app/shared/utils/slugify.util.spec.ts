import { slugify } from './slugify.util';

describe('slugify.util', () => {
  it('lowercases and replaces spaces with underscore', () => {
    expect(slugify('Hello World')).toBe('hello_world');
  });

  it('strips non-alphanumeric except underscore and hyphen', () => {
    expect(slugify('a-b_c 1')).toBe('a-b_c_1');
    expect(slugify('form.name!')).toBe('formname');
  });

  it('returns "form" when result would be empty', () => {
    expect(slugify('!!!')).toBe('form');
    expect(slugify('')).toBe('form');
  });
});
