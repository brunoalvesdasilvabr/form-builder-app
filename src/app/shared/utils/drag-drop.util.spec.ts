import { getWidgetTypeFromDragEvent } from './drag-drop.util';
import { DragDropDataKey } from '../constants/drag-drop.constants';

describe('drag-drop.util', () => {
  it('returns type from WidgetType key', () => {
    const e = {
      dataTransfer: {
        getData: (k: string) => (k === DragDropDataKey.WidgetType ? 'input' : ''),
      },
    } as unknown as DragEvent;
    expect(getWidgetTypeFromDragEvent(e)).toBe('input');
  });

  it('falls back to text/plain', () => {
    const e = {
      dataTransfer: {
        getData: (k: string) => (k === 'text/plain' ? 'label' : ''),
      },
    } as unknown as DragEvent;
    expect(getWidgetTypeFromDragEvent(e)).toBe('label');
  });

  it('returns null for invalid type', () => {
    const e = {
      dataTransfer: { getData: () => 'invalid' },
    } as unknown as DragEvent;
    expect(getWidgetTypeFromDragEvent(e)).toBeNull();
  });

  it('returns null when dataTransfer null', () => {
    const e = { dataTransfer: null } as unknown as DragEvent;
    expect(getWidgetTypeFromDragEvent(e)).toBeNull();
  });

  it('trims and accepts valid type', () => {
    const e = {
      dataTransfer: { getData: () => '  grid  ' },
    } as unknown as DragEvent;
    expect(getWidgetTypeFromDragEvent(e)).toBe('grid');
  });
});
