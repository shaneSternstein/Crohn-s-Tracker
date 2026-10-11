import type { Component, Entry, Item } from './types';

type Names = Map<number, string>;
type Items = Map<number, Item>;

/** "flour (1.5 cup, sifted)" */
export function formatLine(c: Component, names: Names, items: Items): string {
  const name =
    c.ingredientId !== undefined ? names.get(c.ingredientId) : c.itemId !== undefined ? items.get(c.itemId)?.name : undefined;
  return [name ?? '?', c.note ? `(${c.note})` : ''].filter(Boolean).join(' ');
}

/** Ingredient summary for a food or drink entry (its own copy, else the item's). Empty for other types. */
export function ingredientText(e: Entry, items: Items, names: Names): string {
  if (e.type !== 'food' && e.type !== 'drink') return '';
  const comps = e.components ?? (e.itemId !== undefined ? items.get(e.itemId)?.components : undefined);
  return comps?.map((c) => formatLine(c, names, items)).join(', ') ?? '';
}
