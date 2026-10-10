import type { Entry } from '../domain/types';
import { HOUR, startOfDay } from '../lib/time';
import type { SymptomGroup } from './burden';
import type { Cell, Reliability } from './stage1';
import { outcomeIncludes, type Outcome } from './windows';

export const OUTCOME_KEYS = ['all', 'Pain', 'Digestive', 'Systemic', 'Bowel'] as const;
/** A group key, or `s:Label` for one symptom. */
export type OutcomeKey = (typeof OUTCOME_KEYS)[number] | `s:${string}`;

export const isOutcomeKey = (k: string | null): k is OutcomeKey =>
  k !== null && (OUTCOME_KEYS.some((o) => o === k) || (k.startsWith('s:') && k.length > 2));
export const outcomeFromKey = (k: OutcomeKey): Outcome =>
  k === 'all' ? {} : k.startsWith('s:') ? { symptom: k.slice(2) } : { group: k as SymptomGroup | 'Bowel' };

/** A symptom needs at least this many entries to be offered as its own outcome. */
export const MIN_SYMPTOM_COUNT = 10;

/** Symptom labels with enough entries, most frequent first. */
export function symptomCounts(entries: Entry[], min = MIN_SYMPTOM_COUNT): { label: string; count: number }[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const e of entries) {
    const label = e.type === 'symptom' ? e.label?.trim() : undefined;
    if (!label) continue;
    const cur = m.get(label.toLowerCase());
    if (cur) cur.count++;
    else m.set(label.toLowerCase(), { label, count: 1 });
  }
  return [...m.values()].filter((x) => x.count >= min).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const RANK: Record<Reliability, number> = { insufficient: 0, none: 1, weak: 2, moderate: 3, strong: 4 };

/** True when `a` is a better cell to show than `b`: more reliable first, then larger increase. */
export const better = (a: Cell, b: Cell) =>
  RANK[a.reliability] !== RANK[b.reliability] ? RANK[a.reliability] > RANK[b.reliability] : (a.effect ?? 0) > (b.effect ?? 0);

/**
 * One row per ingredient with higher burden after exposure: its best window, ordered by reliability then size.
 * `needMore` counts ingredients where no window had enough data.
 */
export function rankTriggers(cells: Cell[]): { rows: Cell[]; needMore: number } {
  const best = new Map<number, Cell>();
  const usable = new Map<number, boolean>();
  for (const c of cells) {
    usable.set(c.ingredientId, (usable.get(c.ingredientId) ?? false) || c.reliability !== 'insufficient');
    if (c.effect === undefined || c.effect <= 0) continue;
    const cur = best.get(c.ingredientId);
    if (!cur || better(c, cur)) best.set(c.ingredientId, c);
  }
  const rows = [...best.values()].sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
  return { rows, needMore: [...usable.values()].filter((v) => !v).length };
}

/** Days with at least one food or drink entry. */
export const loggedDayCount = (entries: Entry[]) =>
  new Set(entries.filter((e) => e.type === 'food' || e.type === 'drink').map((e) => startOfDay(e.start))).size;

export interface Followup { entry: Entry; hoursAfter: number }
export interface Exposure { entry: Entry; followups: Followup[] }

/** Every food or drink entry containing the ingredient (newest first) with the outcome entries in the next 48 hours. */
export function exposureList(entries: Entry[], ingredientId: number, outcome: Outcome): Exposure[] {
  const outcomes = entries.filter((e) => outcomeIncludes(e, outcome)).sort((a, b) => a.start - b.start);
  return entries
    .filter((e) => (e.type === 'food' || e.type === 'drink') && e.ingredientIds?.includes(ingredientId))
    .sort((a, b) => b.start - a.start)
    .map((entry) => ({
      entry,
      followups: outcomes
        .filter((f) => f.start > entry.start && f.start <= entry.start + 48 * HOUR)
        .map((f) => ({ entry: f, hoursAfter: (f.start - entry.start) / HOUR })),
    }));
}
