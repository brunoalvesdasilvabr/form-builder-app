import { computeLayoutDropPosition } from './layout-drop.util';
import { LayoutAction, LayoutDropPosition } from '../enums';

describe('layout-drop.util', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 } as DOMRect;

  it('returns Before for row when y < 0.5', () => {
    expect(computeLayoutDropPosition(rect, 50, 20, LayoutAction.Row)).toBe(LayoutDropPosition.Before);
  });

  it('returns After for row when y >= 0.5', () => {
    expect(computeLayoutDropPosition(rect, 50, 60, LayoutAction.Row)).toBe(LayoutDropPosition.After);
  });

  it('returns Before for col when x < 0.5', () => {
    expect(computeLayoutDropPosition(rect, 20, 50, LayoutAction.Col)).toBe(LayoutDropPosition.Before);
  });

  it('returns After for col when x >= 0.5', () => {
    expect(computeLayoutDropPosition(rect, 60, 50, LayoutAction.Col)).toBe(LayoutDropPosition.After);
  });
});
