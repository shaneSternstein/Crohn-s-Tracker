import { db } from './schema';
import { ML_PER_CUP } from '../domain/hydration';
import { flattenIngredientIds } from '../domain/recipes';
import type {
  Component, Entry, HydrationLog, IngredientLine, Item, ItemKind, SleepLog,
} from '../domain/types';

export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/* ---------- Ingredients & items ---------- */

async function ingredientId(name: string): Promise<number> {
  const key = nameKey(name);
  const hit = await db.ingredients.where('nameKey').equals(key).first();
  return hit?.id ?? db.ingredients.add({ name: name.trim(), nameKey: key });
}

export interface ItemDraft {
  kind: ItemKind;
  name: string;
  barcode?: string;
  dose?: string;
  lines: IngredientLine[];
}

export function saveItem(draft: ItemDraft, id?: number): Promise<number> {
  return db.transaction('rw', db.items, db.ingredients, async () => {
    const components: Component[] = [];
    for (const l of draft.lines) {
      const meta = { qty: l.qty, unit: l.unit, note: l.note };
      if (l.itemId !== undefined) components.push({ itemId: l.itemId, ...meta });
      else if (l.name?.trim()) components.push({ ingredientId: await ingredientId(l.name), ...meta });
    }
    const ingredientIds = [
      ...new Set(components.flatMap((c) => (c.ingredientId !== undefined ? [c.ingredientId] : []))),
    ];
    const now = Date.now();
    const base = { kind: draft.kind, name: draft.name.trim(), barcode: draft.barcode, dose: draft.dose, components, ingredientIds };

    if (id !== undefined) {
      await db.items.update(id, base);
      return id;
    }
    return db.items.add({ ...base, createdAt: now, lastUsedAt: now, useCount: 0 });
  });
}

export const getItem = (id: number) => db.items.get(id);
export const getItemByBarcode = (code: string) => db.items.where('barcode').equals(code).first();

export function recentItems(kind?: ItemKind, limit = 12): Promise<Item[]> {
  const rows = db.items.orderBy('lastUsedAt').reverse();
  return (kind ? rows.filter((i) => i.kind === kind) : rows).limit(limit).toArray();
}

export function searchItems(query: string, limit = 20): Promise<Item[]> {
  const q = nameKey(query);
  return db.items.filter((i) => nameKey(i.name).includes(q)).limit(limit).toArray();
}

export const itemIngredientIds = (item: Item) => flattenIngredientIds(item, getItem);

/* ---------- Entries ---------- */

export function addEntry(entry: Omit<Entry, 'id'>): Promise<number> {
  return db.transaction('rw', db.entries, db.items, async () => {
    const dose =
      entry.dose ??
      (entry.type === 'medication' && entry.itemId !== undefined
        ? (await db.items.get(entry.itemId))?.dose
        : undefined);
    const id = await db.entries.add({ ...entry, dose });
    if (entry.itemId !== undefined) {
      await db.items.where(':id').equals(entry.itemId).modify((i) => {
        i.lastUsedAt = entry.start;
        i.useCount += 1;
      });
    }
    return id;
  });
}

export const updateEntry = (id: number, patch: Partial<Entry>) => db.entries.update(id, patch);
export const deleteEntry = (id: number) => db.entries.delete(id);
export const endEntry = (id: number, end = Date.now()) => db.entries.update(id, { end, ongoing: false });

/** Entries overlapping [from, to). Ongoing entries extend to now. */
export async function entriesBetween(from: number, to: number): Promise<Entry[]> {
  const now = Date.now();
  const rows = await db.entries.where('start').below(to).toArray();
  return rows
    .filter((e) => (e.ongoing ? now : e.end ?? e.start) >= from)
    .sort((a, b) => a.start - b.start);
}

/* ---------- Sleep & hydration ---------- */

export const logSleep = (start: number, end: number) => db.sleep.add({ start, end });
export const sleepBetween = (from: number, to: number): Promise<SleepLog[]> =>
  db.sleep.where('start').between(from, to).toArray();

export const addWater = (ml = ML_PER_CUP, at = Date.now()) => db.hydration.add({ at, ml });
export const lastWater = () => db.hydration.orderBy('at').last();
export const undoLastWater = async () => {
  const last = await lastWater();
  if (last?.id !== undefined) await db.hydration.delete(last.id);
};
export const hydrationBetween = (from: number, to: number): Promise<HydrationLog[]> =>
  db.hydration.where('at').between(from, to).toArray();
export const hydrationTotal = async (from: number, to: number) =>
  (await hydrationBetween(from, to)).reduce((sum, h) => sum + h.ml, 0);
