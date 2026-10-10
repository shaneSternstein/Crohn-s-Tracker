import { describe, expect, it } from 'vitest';
import { fetchProduct, flattenIngredients, ingredientsFromText, normalizeBarcode } from './openfoodfacts';

const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe('normalizeBarcode', () => {
  it('keeps digits and checks the length', () => {
    expect(normalizeBarcode('0 737628 064502')).toBe('0737628064502');
    expect(normalizeBarcode('123')).toBeNull();
  });
});

describe('ingredient parsing', () => {
  it('flattens nested ingredients', () => {
    const list = [{ id: 'en:wheat-flour', text: 'Wheat Flour', ingredients: [{ id: 'en:niacin', text: 'niacin' }] }, { id: 'en:sugar' }];
    expect(flattenIngredients(list)).toEqual(['wheat flour', 'niacin', 'sugar']);
  });
  it('parses a text list', () => {
    expect(ingredientsFromText('Wheat flour (45%), sugar, _milk_.')).toEqual(['wheat flour', 'sugar', 'milk']);
  });
});

describe('fetchProduct', () => {
  it('returns name and ingredients for a found product', async () => {
    const f = reply({ status: 1, product: { product_name: 'Cereal', ingredients: [{ text: 'Oats' }] } });
    expect(await fetchProduct('0123456789012', f)).toEqual({ found: true, name: 'Cereal', ingredients: ['oats'] });
  });
  it('reports a missing product', async () => {
    expect((await fetchProduct('0123456789012', reply({ status: 0 }, 404))).found).toBe(false);
  });
  it('throws on server errors', async () => {
    await expect(fetchProduct('0123456789012', reply({}, 500))).rejects.toThrow();
  });
});
