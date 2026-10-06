import type { Item } from './types';

/** Resolves all raw ingredient ids in an item, expanding nested recipes. Cycle-safe. */
export async function flattenIngredientIds(
  item: Item,
  getItem: (id: number) => Promise<Item | undefined>,
  seen = new Set<number>(),
): Promise<Set<number>> {
  const out = new Set<number>(item.ingredientIds);
  if (item.id !== undefined) seen.add(item.id);
  for (const c of item.components) {
    if (c.itemId === undefined || seen.has(c.itemId)) continue;
    const child = await getItem(c.itemId);
    if (child) (await flattenIngredientIds(child, getItem, seen)).forEach((i) => out.add(i));
  }
  return out;
}
