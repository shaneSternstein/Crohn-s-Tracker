import type { Item } from '../domain/types';

/**
 * Filters and ranks items for a search box: name starts with the text, then a word starts with it,
 * then the name contains it, then an ingredient contains it. Ties go to frequently and recently used items.
 * An empty query returns the items unchanged.
 */
export function matchItems(items: Item[], query: string, names: Map<number, string>): Item[] {
  const k = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!k) return items;
  const scored: [number, Item][] = [];
  for (const i of items) {
    const n = i.name.toLowerCase();
    let s = -1;
    if (n.startsWith(k)) s = 0;
    else if (n.split(/\s+/).some((w) => w.startsWith(k))) s = 1;
    else if (n.includes(k)) s = 2;
    else if (i.ingredientIds.some((id) => names.get(id)?.toLowerCase().includes(k))) s = 3;
    if (s >= 0) scored.push([s, i]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || b[1].useCount - a[1].useCount || b[1].lastUsedAt - a[1].lastUsedAt)
    .map((x) => x[1]);
}
