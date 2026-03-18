import { getElementClassObj } from './element-class.util';

describe('element-class.util', () => {
  it('returns object with class when elementClasses[key] is set', () => {
    const widget = { elementClasses: { control: 'my-class' } } as any;
    expect(getElementClassObj(widget, 'control')).toEqual({ 'my-class': true });
  });

  it('returns empty object when key missing', () => {
    const widget = { elementClasses: {} } as any;
    expect(getElementClassObj(widget, 'control')).toEqual({});
  });

  it('returns empty object when widget undefined', () => {
    expect(getElementClassObj(undefined, 'control')).toEqual({});
  });

  it('returns empty object when elementClasses undefined', () => {
    const widget = {} as any;
    expect(getElementClassObj(widget, 'control')).toEqual({});
  });
});
