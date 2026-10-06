import { describe, expect, it } from 'vitest';
import { layoutColumn } from './layout';

const H = 3_600_000;
const row = (id: string, s: number, e: number) => ({ item: id, start: s * H, end: e * H });

describe('layoutColumn', () => {
  it('gives non-overlapping rows full width', () => {
    const { blocks } = layoutColumn([row('a', 0, 1), row('b', 2, 3)], H / 2);
    expect(blocks.map((b) => b.lanes)).toEqual([1, 1]);
  });
  it('splits two overlapping rows', () => {
    const { blocks, overflow } = layoutColumn([row('a', 0, 2), row('b', 1, 3)], H / 2);
    expect(blocks.map((b) => [b.lane, b.lanes])).toEqual([[0, 2], [1, 2]]);
    expect(overflow).toEqual([]);
  });
  it('collapses the third overlapping row into +1', () => {
    const { blocks, overflow } = layoutColumn([row('a', 0, 3), row('b', 0, 3), row('c', 1, 2)], H / 2);
    expect(blocks).toHaveLength(2);
    expect(overflow).toEqual([{ at: H, count: 1 }]);
  });
});
