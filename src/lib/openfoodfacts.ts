const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'product_name,brands,ingredients,ingredients_text';

interface OffIngredient { id?: string; text?: string; ingredients?: OffIngredient[] }
interface OffProduct { product_name?: string; ingredients?: OffIngredient[]; ingredients_text?: string }

export interface Scanned { found: boolean; name: string; ingredients: string[] }

/** Digits only; EAN-8, UPC-A, EAN-13 and similar lengths. Returns null if it cannot be a barcode. */
export function normalizeBarcode(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 14 ? d : null;
}

const clean = (s: string) =>
  s.replace(/_/g, '').replace(/\d+(?:[.,]\d+)?\s*%/g, '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.:]+$/, '');
const fromId = (id: string) => id.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');

/** Top-level and nested (sub-)ingredients, in order, without duplicates. */
export function flattenIngredients(list: OffIngredient[] | undefined): string[] {
  const out: string[] = [];
  const walk = (xs: OffIngredient[]) => {
    for (const x of xs) {
      const n = clean(x.text ?? (x.id ? fromId(x.id) : ''));
      if (n) out.push(n);
      if (x.ingredients) walk(x.ingredients);
    }
  };
  walk(list ?? []);
  return [...new Set(out)];
}

/** Fallback for products that only have a text list. Brackets become separators; percentages are dropped. */
export function ingredientsFromText(text: string): string[] {
  return [...new Set(text.replace(/[()[\]]/g, ',').split(/[,;]/).map(clean).filter(Boolean))];
}

export function productIngredients(p: OffProduct): string[] {
  const list = flattenIngredients(p.ingredients);
  return list.length ? list : ingredientsFromText(p.ingredients_text ?? '');
}

/** Looks a barcode up on Open Food Facts (no key needed). Throws on network or server errors. */
export async function fetchProduct(code: string, fetchImpl: typeof fetch = fetch): Promise<Scanned> {
  const res = await fetchImpl(`${ENDPOINT}${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (!res.ok && res.status !== 404) throw new Error(`Open Food Facts returned ${res.status}.`);
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return { found: false, name: '', ingredients: [] };
  const p = data.product;
  return { found: true, name: (p.product_name ?? '').trim() || 'Scanned product', ingredients: productIngredients(p) };
}
