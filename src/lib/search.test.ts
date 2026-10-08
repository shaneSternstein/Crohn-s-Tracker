import { describe, expect, it } from 'vitest';
import type { Item } from '../domain/types';
import { matchItems } from './search';

const item = (id: number, name: string, ingredientIds: number[] = []): Item => ({
  id, kind: 'food', name, components: [], ingredientIds, createdAt: 0, lastUsedAt: 0, useCount: 0,
});
const names = new Map([[1, 'chicken'], [2, 'rice']]);
const items = [item(1, 'Rice bowl', [2]), item(2, 'Grilled chicken', [1]), item(3, 'Chicken soup', [1]), item(4, 'Salad')];

describe('matchItems', () => {
  it('ranks name prefix before word prefix', () => {
    expect(matchItems(items, 'chick', names).map((i) => i.id)).toEqual([3, 2]);
  });
  it('matches by ingredient', () => {
    expect(matchItems(items, 'rice', names).map((i) => i.id)).toEqual([1]);
  });
  it('returns everything for an empty query', () => {
    expect(matchItems(items, '  ', names)).toHaveLength(4);
  });
});
