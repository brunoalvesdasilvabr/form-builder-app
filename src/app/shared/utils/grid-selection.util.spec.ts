import {
  computeMergeRange,
  canMergeFromRange,
  updateSelectionForCtrlClick,
  type MergeRange,
} from './grid-selection.util';

describe('grid-selection.util', () => {
  describe('computeMergeRange', () => {
    it('returns null for empty selection', () => {
      expect(computeMergeRange([])).toBeNull();
    });

    it('returns range for single cell', () => {
      expect(computeMergeRange(['1,2'])).toEqual({ r0: 1, r1: 1, c0: 2, c1: 2 });
    });

    it('returns range for rectangle', () => {
      expect(computeMergeRange(['0,0', '0,1', '1,0', '1,1'])).toEqual({
        r0: 0,
        r1: 1,
        c0: 0,
        c1: 1,
      });
    });

    it('returns null when selection has gaps', () => {
      expect(computeMergeRange(['0,0', '0,2'])).toBeNull();
      expect(computeMergeRange(['0,0', '1,1'])).toBeNull();
    });
  });

  describe('canMergeFromRange', () => {
    it('returns false for null', () => {
      expect(canMergeFromRange(null)).toBe(false);
    });

    it('returns false for single column', () => {
      expect(canMergeFromRange({ r0: 0, r1: 2, c0: 1, c1: 1 })).toBe(false);
    });

    it('returns true when c0 < c1', () => {
      expect(canMergeFromRange({ r0: 0, r1: 1, c0: 0, c1: 1 })).toBe(true);
    });
  });

  describe('updateSelectionForCtrlClick', () => {
    it('selects single cell when none selected', () => {
      expect(updateSelectionForCtrlClick([], 2, 3)).toEqual(['2,3']);
    });

    it('deselects when cell already selected', () => {
      expect(updateSelectionForCtrlClick(['1,1'], 1, 1)).toEqual([]);
    });

    it('fills rectangle when one cell selected and another clicked', () => {
      expect(updateSelectionForCtrlClick(['0,0'], 2, 2).sort()).toEqual(
        ['0,0', '0,1', '0,2', '1,0', '1,1', '1,2', '2,0', '2,1', '2,2'].sort()
      );
    });

    it('adds cell when many selected', () => {
      expect(updateSelectionForCtrlClick(['0,0', '0,1'], 1, 0)).toEqual(['0,0', '0,1', '1,0']);
    });
  });
});
