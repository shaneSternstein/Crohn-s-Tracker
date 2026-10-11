import { describe, expect, it } from 'vitest';
import { parseIngredients, parseLine } from './parseIngredients';

describe('parseLine', () => {
  it('moves amounts into the note and keeps the name', () => {
    expect(parseLine('1 1/2 cups flour, sifted')).toEqual({ name: 'flour', note: '1.5 cup, sifted' });
  });
  it('parses unicode fractions', () => {
    expect(parseLine('1½ tbsp olive oil')).toEqual({ name: 'olive oil', note: '1.5 tbsp' });
  });
  it('keeps counts without units', () => {
    expect(parseLine('2 eggs')).toEqual({ name: 'eggs', note: '2' });
  });
  it('keeps ranges in the note', () => {
    expect(parseLine('2-3 cloves garlic')).toMatchObject({ name: 'cloves garlic', note: expect.stringContaining('2–3') });
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
