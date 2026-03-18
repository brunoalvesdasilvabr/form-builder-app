import type { WidgetInstance } from './canvas.model';
import {
  getDefaultWidgetLabel,
  getCanvasCellWidgets,
  getNestedCellWidgets,
  getPrimaryWidget,
  getWidgetByIdOrPrimary,
} from './canvas.model';

describe('canvas.model', () => {
  describe('getDefaultWidgetLabel', () => {
    it('returns label from WIDGET_LABELS for most types', () => {
      expect(getDefaultWidgetLabel('input')).toBe('Input');
      expect(getDefaultWidgetLabel('label')).toBe('Label');
    });

    it('returns "Choose one" for radio when no override', () => {
      expect(getDefaultWidgetLabel('radio')).toBe('Choose one');
    });

    it('returns trimmed override when provided', () => {
      expect(getDefaultWidgetLabel('input', '  My Input  ')).toBe('My Input');
    });

    it('uses type default when override is whitespace', () => {
      expect(getDefaultWidgetLabel('radio', '   ')).toBe('Choose one');
    });
  });

  describe('getCanvasCellWidgets', () => {
    it('returns widgets array when present', () => {
      const cell = { widgets: [{ id: 'w1', type: 'label' }] } as any;
      expect(getCanvasCellWidgets(cell)).toEqual([{ id: 'w1', type: 'label' }]);
    });

    it('returns [widget] for legacy widget', () => {
      const cell = { widget: { id: 'w1', type: 'input' } } as any;
      expect(getCanvasCellWidgets(cell)).toEqual([{ id: 'w1', type: 'input' }]);
    });

    it('returns [] when neither widgets nor widget', () => {
      expect(getCanvasCellWidgets({} as any)).toEqual([]);
      expect(getCanvasCellWidgets({ widget: null } as any)).toEqual([]);
    });
  });

  describe('getNestedCellWidgets', () => {
    it('returns widgets array when present', () => {
      const cell = { widgets: [{ id: 'w1', type: 'label' }] } as any;
      expect(getNestedCellWidgets(cell)).toEqual([{ id: 'w1', type: 'label' }]);
    });

    it('returns [widget] for legacy widget', () => {
      const cell = { widget: { id: 'w1', type: 'input' } } as any;
      expect(getNestedCellWidgets(cell)).toEqual([{ id: 'w1', type: 'input' }]);
    });
  });

  describe('getPrimaryWidget', () => {
    it('returns first widget or null', () => {
      expect(getPrimaryWidget({ widgets: [{ id: 'w1', type: 'label' }] } as any)?.id).toBe('w1');
      expect(getPrimaryWidget({} as any)).toBeNull();
      expect(getPrimaryWidget({ widget: { id: 'x', type: 'input' } } as any)?.id).toBe('x');
    });
  });

  describe('getWidgetByIdOrPrimary', () => {
    it('returns null for null cell', () => {
      expect(getWidgetByIdOrPrimary(null, 'w1')).toBeNull();
    });

    it('returns widget by id when found', () => {
      const w1: WidgetInstance = { id: 'w1', type: 'label' };
      const w2: WidgetInstance = { id: 'w2', type: 'input' };
      const cell = { widgets: [w1, w2] } as any;
      expect(getWidgetByIdOrPrimary(cell, 'w2')).toBe(w2);
    });

    it('returns primary when id null or not found', () => {
      const w1: WidgetInstance = { id: 'w1', type: 'label' };
      const cell = { widgets: [w1] } as any;
      expect(getWidgetByIdOrPrimary(cell, null)).toBe(w1);
      expect(getWidgetByIdOrPrimary(cell, 'missing')).toBe(w1);
    });
  });
});
