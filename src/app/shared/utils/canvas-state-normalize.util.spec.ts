import { normalizeCanvasState } from './canvas-state-normalize.util';
import type { CanvasState, CanvasCell } from '../models/canvas.model';

describe('canvas-state-normalize.util', () => {
  it('adds widgets array from legacy widget', () => {
    const state: CanvasState = {
      rows: [
        {
          id: 'r1',
          cells: [
            {
              id: 'c1',
              rowIndex: 0,
              colIndex: 0,
              widget: { id: 'w1', type: 'label' },
              colSpan: 1,
              rowSpan: 1,
              isMergedOrigin: true,
            } as CanvasCell,
          ],
        },
      ],
    };
    const out = normalizeCanvasState(state);
    expect(out.rows[0].cells[0].widgets).toEqual([{ id: 'w1', type: 'label' }]);
    expect((out.rows[0].cells[0] as any).widget).toBeUndefined();
  });

  it('keeps existing widgets array', () => {
    const state: CanvasState = {
      rows: [
        {
          id: 'r1',
          cells: [
            {
              id: 'c1',
              rowIndex: 0,
              colIndex: 0,
              widgets: [{ id: 'w1', type: 'input' }],
              colSpan: 1,
              rowSpan: 1,
              isMergedOrigin: true,
            },
          ],
        },
      ],
    };
    const out = normalizeCanvasState(state);
    expect(out.rows[0].cells[0].widgets).toEqual([{ id: 'w1', type: 'input' }]);
  });

  it('normalizes nested table inside table widget', () => {
    const state: CanvasState = {
      rows: [
        {
          id: 'r1',
          cells: [
            {
              id: 'c1',
              rowIndex: 0,
              colIndex: 0,
              widgets: [
                {
                  id: 'w1',
                  type: 'table',
                  nestedTable: {
                    rows: [
                      {
                        id: 'nr1',
                        cells: [
                          {
                            id: 'nc1',
                            rowIndex: 0,
                            colIndex: 0,
                            widget: { id: 'nw1', type: 'label' },
                            colSpan: 1,
                            rowSpan: 1,
                            isMergedOrigin: true,
                          } as any,
                        ],
                      },
                    ],
                  },
                },
              ],
              colSpan: 1,
              rowSpan: 1,
              isMergedOrigin: true,
            },
          ],
        },
      ],
    };
    const out = normalizeCanvasState(state);
    const nested = out.rows[0].cells[0].widgets[0].nestedTable!;
    expect(nested.rows[0].cells[0].widgets).toEqual([{ id: 'nw1', type: 'label' }]);
  });
});
