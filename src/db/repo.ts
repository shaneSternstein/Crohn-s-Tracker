import { db } from './schema';
import { ML_PER_CUP } from '../domain/hydration';
import { flattenIngredientIds } from '../domain/recipes';
import type {
  Component, Entry, HydrationLog, IngredientLine, Item, ItemKind, Preset, SleepLog,
} from '../domain/types';

export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/* ---------- Ingredients, lines, items ---------- */

async function ingredientId(name: string): Promise<number> {
  const key = nameKey(name);
  const hit = await db.ingredients.where('nameKey').equals(key).first();
  return hit?.id ?? db.ingredients.add({ name: name.trim(), nameKey: key });
}

/** Turns editable lines into components, plus direct and fully expanded ingredient ids. Call inside a transaction. */
async function resolveLines(lines: IngredientLine[], fallbackName?: string) {
  const components: Component[] = [];
  const all = new Set<number>();
  for (const l of lines) {
    const meta = { qty: l.qty, unit: l.unit, note: l.note };
    if (l.itemId !== undefined) {
      components.push({ itemId: l.itemId, ...meta });
      const child = await db.items.get(l.itemId);
      if (child) (await flattenIngredientIds(child, getItem)).forEach((i) => all.add(i));
    } else if (l.name?.trim()) {
      const id = await ingredientId(l.name);
      components.push({ ingredientId: id, ...meta });
      all.add(id);
    }
  }
  // No ingredients given: the item's own name stands in, so plain foods and drinks still count as exposures.
  if (!components.length && fallbackName?.trim()) {
    const id = await ingredientId(fallbackName);
    components.push({ ingredientId: id });
    all.add(id);
  }
  const direct = [...new Set(components.flatMap((c) => (c.ingredientId !== undefined ? [c.ingredientId] : [])))];
  return { components, direct, all: [...all] };
}

const sigOf = (cs: Component[]) =>
  JSON.stringify(cs.map((c) => [c.ingredientId ?? null, c.itemId ?? null, c.qty ?? null, c.unit ?? null, c.note ?? null]));

export async function linesFromComponents(components: Component[]): Promise<IngredientLine[]> {
  const lines: IngredientLine[] = [];
  for (const c of components) {
    const meta = { qty: c.qty, unit: c.unit, note: c.note };
    if (c.itemId !== undefined) lines.push({ itemId: c.itemId, name: (await db.items.get(c.itemId))?.name, ...meta });
    else if (c.ingredientId !== undefined) lines.push({ name: (await db.ingredients.get(c.ingredientId))?.name, ...meta });
  }
  return lines;
}

export interface ItemDraft {
  kind: ItemKind;
  name: string;
  barcode?: string;
  dose?: string;
  lines: IngredientLine[];
}

/** Creates or updates an item. Item names are unique (case-insensitive). */
export function saveItem(draft: ItemDraft, id?: number): Promise<number> {
  return db.transaction('rw', db.items, db.ingredients, async () => {
    const name = draft.name.trim();
    const key = nameKey(name);
    const dupe = await db.items.filter((i) => !i.archived && nameKey(i.name) === key && i.id !== id).first();
    if (dupe) throw new Error(`An item named "${name}" already exists. Choose a different name.`);

    const { components, direct } = await resolveLines(draft.lines, draft.kind === 'medication' ? undefined : name);
    const now = Date.now();
    const base = { kind: draft.kind, name, barcode: draft.barcode, dose: draft.dose, components, ingredientIds: direct };

    if (id !== undefined) {
      await db.items.update(id, base);
      return id;
    }
    return db.items.add({ ...base, createdAt: now, lastUsedAt: now, useCount: 0 });
  });
}

export const getItem = (id: number) => db.items.get(id);
export const getItemByBarcode = (code: string) => db.items.where('barcode').equals(code).first();

/** Most recently used visible items (hidden ones are excluded). */
export function recentItems(kind?: ItemKind, limit = 12): Promise<Item[]> {
  return db.items
    .orderBy('lastUsedAt')
    .reverse()
    .filter((i) => !i.archived && (!kind || i.kind === kind))
    .limit(limit)
    .toArray();
}

export function searchItems(query: string, limit = 20): Promise<Item[]> {
  const q = nameKey(query);
  return db.items.filter((i) => !i.archived && nameKey(i.name).includes(q)).limit(limit).toArray();
}

/** How many past entries and recipes reference an item. */
export async function itemUsage(id: number) {
  const entries = await db.entries.filter((e) => e.itemId === id).count();
  const recipes = await db.items.filter((i) => i.id !== id && i.components.some((c) => c.itemId === id)).count();
  return { entries, recipes };
}

/** Deletes an unused item; hides one that history or recipes still reference. */
export async function removeItem(id: number): Promise<'deleted' | 'hidden'> {
  const u = await itemUsage(id);
  if (u.entries + u.recipes === 0) {
    await db.items.delete(id);
    return 'deleted';
  }
  await db.items.update(id, { archived: true });
  return 'hidden';
}

export async function restoreItem(id: number): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  const key = nameKey(item.name);
  const dupe = await db.items.filter((i) => !i.archived && i.id !== id && nameKey(i.name) === key).first();
  if (dupe) throw new Error(`A saved item named "${item.name}" already exists. Rename one of them first.`);
  await db.items.update(id, { archived: false });
}

export const itemIngredientIds = (item: Item) => flattenIngredientIds(item, getItem);

/* ---------- Food and drink entries (each carries its own ingredient copy) ---------- */

interface FoodLog { type: 'food' | 'drink'; start: number; itemId: number; lines: IngredientLine[]; modified: boolean }

export function logFood(a: FoodLog): Promise<number> {
  return db.transaction('rw', db.entries, db.items, db.ingredients, async () => {
    const named = await db.items.get(a.itemId);
    const { components, all } = await resolveLines(a.lines, named?.name);
    const id = await db.entries.add({
      type: a.type, start: a.start, ongoing: false, itemId: a.itemId,
      components, ingredientIds: all, modified: a.modified || undefined,
    });
    await db.items.where(':id').equals(a.itemId).modify((i) => {
      i.lastUsedAt = a.start;
      i.useCount += 1;
    });
    return id;
  });
}

export function updateFoodEntry(id: number, a: { start: number; itemId: number; lines: IngredientLine[] }) {
  return db.transaction('rw', db.entries, db.items, db.ingredients, async () => {
    const item = await db.items.get(a.itemId);
    const { components, all } = await resolveLines(a.lines, item?.name);
    const modified = !!item && item.components.length > 0 && sigOf(components) !== sigOf(item.components);
    await db.entries.update(id, {
      start: a.start, itemId: a.itemId, components, ingredientIds: all, modified: modified || undefined,
    });
  });
}

/** Pushes an item's current ingredients to past entries that use it, except ones changed individually. */
export async function applyItemToEntries(itemId: number): Promise<void> {
  const item = await db.items.get(itemId);
  if (!item) return;
  const all = [...(await flattenIngredientIds(item, getItem))];
  await db.entries
    .filter((e) => e.itemId === itemId && (e.type === 'food' || e.type === 'drink') && !e.modified)
    .modify((e) => {
      e.components = item.components;
      e.ingredientIds = all;
    });
}

/** Gives entries logged before per-entry copies existed (or restored from old backups) a copy. Idempotent. */
export async function backfillSnapshots(): Promise<void> {
  const missing = await db.entries
    .filter((e) => (e.type === 'food' || e.type === 'drink') && e.itemId !== undefined && !e.components)
    .toArray();
  for (const e of missing) {
    const item = await db.items.get(e.itemId!);
    if (!item) continue;
    const all = [...(await flattenIngredientIds(item, getItem))];
    await db.entries.update(e.id!, { components: item.components, ingredientIds: all });
  }
}

/** Gives food and drink items and entries with no ingredients their own name as the ingredient. Idempotent. */
export async function backfillIngredients(): Promise<void> {
  await db.transaction('rw', db.items, db.entries, db.ingredients, async () => {
    const bare = await db.items.filter((i) => i.kind !== 'medication' && i.components.length === 0).toArray();
    for (const it of bare) {
      const id = await ingredientId(it.name);
      await db.items.update(it.id!, { components: [{ ingredientId: id }], ingredientIds: [id] });
    }
    const entries = await db.entries
      .filter((e) => (e.type === 'food' || e.type === 'drink') && e.itemId !== undefined && !e.ingredientIds?.length)
      .toArray();
    for (const e of entries) {
      const item = await db.items.get(e.itemId!);
      if (!item || item.kind === 'medication') continue;
      const all = [...(await flattenIngredientIds(item, getItem))];
      if (all.length) await db.entries.update(e.id!, { components: item.components, ingredientIds: all });
    }
  });
}

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
export const sleepOverlapping = (from: number, to: number): Promise<SleepLog[]> =>
  db.sleep.where('start').below(to).filter((s) => s.end > from).toArray();
export const updateSleep = (id: number, start: number, end: number) => db.sleep.update(id, { start, end });
export const deleteSleep = (id: number) => db.sleep.delete(id);
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

/* ---------- Chips (presets) ---------- */

export async function presetsOf(type: Preset['type']): Promise<Preset[]> {
  const rows = await db.presets.where('type').equals(type).toArray();
  return rows.sort((a, b) => (a.order ?? a.id!) - (b.order ?? b.id!));
}

export async function addPreset(type: Preset['type'], label: string): Promise<number> {
  const rows = await presetsOf(type);
  const next = rows.length ? Math.max(...rows.map((r) => r.order ?? r.id!)) + 1 : 0;
  return db.presets.add({ type, label: label.trim(), order: next });
}

/** Saves a chip order: ids in display order become order 0..n-1. */
export async function reorderPresets(ids: number[]): Promise<void> {
  await db.transaction('rw', db.presets, async () => {
    for (const [k, id] of ids.entries()) await db.presets.update(id, { order: k });
  });
}

export const countPresetUses = (p: Preset) =>
  p.type === 'stool'
    ? db.entries.filter((e) => e.type === 'stool' && !!e.tags?.includes(p.label)).count()
    : db.entries.filter((e) => e.type === p.type && e.label === p.label).count();

/** Renames a chip; optionally rewrites the label on past entries too. Throws ConstraintError on a duplicate. */
export async function renamePreset(id: number, label: string, alsoEntries: boolean): Promise<void> {
  const name = label.trim();
  if (!name) return;
  await db.transaction('rw', db.presets, db.entries, async () => {
    const p = await db.presets.get(id);
    if (!p) return;
    await db.presets.update(id, { label: name });
    if (!alsoEntries) return;
    if (p.type === 'stool') {
      await db.entries
        .filter((e) => e.type === 'stool' && !!e.tags?.includes(p.label))
        .modify((e) => { e.tags = e.tags!.map((t) => (t === p.label ? name : t)); });
    } else {
      await db.entries.filter((e) => e.type === p.type && e.label === p.label).modify({ label: name });
    }
  });
}

export const deletePreset = (id: number) => db.presets.delete(id);
