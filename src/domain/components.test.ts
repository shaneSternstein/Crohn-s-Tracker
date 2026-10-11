import { describe, expect, it } from 'vitest';
import { foldQuantity, foldRow } from './components';

describe('foldQuantity', () => {
  it('moves amount and unit into the note', () => {
    expect(foldQuantity({ ingredientId: 1, qty: 1.5, unit: 'cup', note: 'sifted' })).toEqual({ ingredientId: 1, note: '1.5 cup, sifted' });
    expect(foldQuantity({ ingredientId: 1, qty: 2 })).toEqual({ ingredientId: 1, note: '2' });
    expect(foldQuantity({ ingredientId: 1, qty: 8, unit: 'fl_oz' })).toEqual({ ingredientId: 1, note: '8 fl oz' });
  });
  it('leaves lines without an amount alone', () => {
    expect(foldQuantity({ ingredientId: 1, note: 'ripe' })).toEqual({ ingredientId: 1, note: 'ripe' });
  });
  it('is idempotent on rows', () => {
    const row = foldRow({ components: [{ ingredientId: 1, qty: 2, unit: 'g' }] });
    expect(foldRow(row)).toEqual(row);
    expect(row.components[0].note).toBe('2 g');
  });
});
