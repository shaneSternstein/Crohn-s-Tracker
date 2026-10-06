import { describe, expect, it } from 'vitest';
import { parseIngredients, parseLine } from './parseIngredients';

describe('parseLine', () => {
  it('parses mixed numbers, units, notes', () => {
    expect(parseLine('1 1/2 cups flour, sifted')).toEqual({ name: 'flour', qty: 1.5, unit: 'cup', note: 'sifted' });
  });
  it('parses unicode fractions', () => {
    expect(parseLine('1½ tbsp olive oil')).toEqual({ name: 'olive oil', qty: 1.5, unit: 'tbsp' });
  });
  it('keeps counts without units', () => {
    expect(parseLine('2 eggs')).toEqual({ name: 'eggs', qty: 2 });
  });
  it('keeps ranges in note', () => {
    expect(parseLine('2-3 cloves garlic')).toMatchObject({ qty: 2, note: expect.stringContaining('2–3') });
  });
  it('keeps name-only lines', () => {
    expect(parseLine('salt to taste')).toEqual({ name: 'salt to taste' });
  });
});

describe('parseIngredients', () => {
  it('splits single-line comma lists', () => {
    expect(parseIngredients('rice, chicken, broccoli').map((l) => l.name)).toEqual(['rice', 'chicken', 'broccoli']);
  });
});
