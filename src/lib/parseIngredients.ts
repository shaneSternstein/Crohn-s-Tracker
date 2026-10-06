import type { IngredientLine, Unit } from '../domain/types';

const UNITS: Record<string, Unit> = {
  cup: 'cup', cups: 'cup', c: 'cup',
  tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
};

const FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8',
};

const NUM = String.raw`\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+`;
const QTY_RE = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|—|to)\s*(${NUM}))?\s*`, 'i');

function toNumber(s: string): number {
  return s.trim().split(/\s+/).reduce((sum, part) => {
    if (part.includes('/')) {
      const [a, b] = part.split('/').map(Number);
      return sum + a / b;
    }
    return sum + Number(part);
  }, 0);
}

function normalize(s: string): string {
  return s
    .replace(/(\d)\s*([½⅓⅔¼¾⅛])/g, (_, d, f) => `${d} ${FRACTIONS[f]}`)
    .replace(/[½⅓⅔¼¾⅛]/g, (f) => FRACTIONS[f])
    .replace(/^[\s\-*•▢☐□]+/, '')
    .trim();
}

export function parseLine(raw: string): IngredientLine | null {
  let s = normalize(raw);
  if (!s) return null;

  const notes: string[] = [];
  let qty: number | undefined;
  let unit: Unit | undefined;

  const q = QTY_RE.exec(s);
  if (q) {
    qty = toNumber(q[1]);
    if (q[2]) notes.push(`range ${q[1]}–${q[2]}`);
    s = s.slice(q[0].length);

    const u = /^(fl\.?\s*oz|[a-z]+)\.?\s*/i.exec(s);
    if (u) {
      const key = u[1].toLowerCase().replace(/\s+/g, ' ');
      const code = key.startsWith('fl') ? 'fl_oz' : UNITS[key];
      if (code) {
        unit = code;
        s = s.slice(u[0].length);
      }
    }
  }

  s = s.replace(/^of\s+/i, '');
  s = s.replace(/\(([^)]*)\)/g, (_, n) => (notes.push(n.trim()), ' '));
  const [name, ...rest] = s.split(',');
  if (rest.length) notes.push(rest.join(',').trim());

  const cleaned = name.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!cleaned) return null;
  return {
    name: cleaned,
    ...(qty !== undefined && { qty }),
    ...(unit && { unit }),
    ...(notes.length && { note: notes.filter(Boolean).join('; ') }),
  };
}

/** One line per ingredient; falls back to comma/semicolon splitting for single-line pastes. */
export function parseIngredients(text: string): IngredientLine[] {
  const parts = /\r?\n/.test(text.trim()) ? text.split(/\r?\n/) : text.split(/[,;]/);
  return parts.map(parseLine).filter((l): l is IngredientLine => l !== null);
}
