import type { Component, Entry, Item } from './types';

type Names = Map<number, string>;
type Items = Map<number, Item>;

/** "1.5 cup flour (sifted)" */
export function formatLine(c: Component, names: Names, items: Items): string {
  const name =
    c.ingredientId !== undefined ? names.get(c.ingredientId) : c.itemId !== undefined ? items.get(c.itemId)?.name : undefined;
  const qty = c.qty !== undefined ? String(Math.round(c.qty * 100) / 100) : '';
  return [qty, c.unit?.replace('_', ' '), name ?? '?', c.note ? `(${c.note})` : ''].filter(Boolean).join(' ');
}

/** Ingredient summary for a food or drink entry; empty for other types. */
export function ingredientText(e: Entry, items: Items, names: Names): string {
  const item = e.itemId !== undefined ? items.get(e.itemId) : undefined;
  if (!item || item.kind === 'medication') return '';
  return item.components.map((c) => formatLine(c, names, items)).join(', ');
}
