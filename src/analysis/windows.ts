import type { Entry } from '../domain/types';
import { HOUR, dayRange, startOfDay } from '../lib/time';
import { groupOf, stoolWeight, symptomSpan, type SymptomGroup } from './burden';

/** Hours after the exposure hour, from inclusive to exclusive. */
export const LAG_WINDOWS = [
  { key: '0-3h', from: 0, to: 3, label: '0 to 3 h' },
  { key: '3-8h', from: 3, to: 8, label: '3 to 8 h' },
  { key: '8-24h', from: 8, to: 24, label: '8 to 24 h' },
  { key: '24-48h', from: 24, to: 48, label: '24 to 48 h' },
] as const;
export type LagWindow = (typeof LAG_WINDOWS)[number];

/** Which burden to analyze. Empty = overall. `group` may be a symptom group or 'Bowel' (stool only). `symptom` is one label. */
export interface Outcome {
  group?: SymptomGroup | 'Bowel';
  symptom?: string;
}

/**
 * Burden on an hourly grid starting at local midnight of the first entry.
 * Bins are exposure times rounded down to the hour.
 */
export interface HourGrid {
  t0: number;
  n: number;
  burden: Float64Array;
  hod: Uint8Array; // local hour of day of each bin
  pb: Float64Array; // prefix sums of burden (length n + 1)
  pu: Int32Array; // prefix counts of unusable bins (length n + 1)
}

/**
 * A bin is usable when it lies fully before `now` on a day with at least one food or drink entry.
 * Days without food or drink are skipped, so they never count as symptom-free.
 */
export function buildGrid(entries: Entry[], outcome: Outcome, now: number): HourGrid | null {
  if (!entries.length) return null;
  const t0 = startOfDay(entries.reduce((m, e) => Math.min(m, e.start), Infinity));
  const n = Math.ceil((dayRange(now)[1] - t0) / HOUR);
  if (n <= 0) return null;

  const burden = new Float64Array(n);
  const sym = outcome.symptom?.trim().toLowerCase();
  const logged = new Set<number>();
  for (const e of entries) {
    if (e.type === 'food' || e.type === 'drink') logged.add(startOfDay(e.start));
    if (e.type === 'symptom') {
      if (outcome.group === 'Bowel') continue;
      if (sym !== undefined && (e.label ?? '').trim().toLowerCase() !== sym) continue;
      if (outcome.group && outcome.group !== groupOf(e.label)) continue;
      const [s, end] = symptomSpan(e, now);
      const sev = e.severity ?? 1;
      for (let i = Math.max(0, Math.floor((s - t0) / HOUR)); i < n && t0 + i * HOUR < end; i++) {
        const o = Math.min(end, t0 + (i + 1) * HOUR) - Math.max(s, t0 + i * HOUR);
        if (o > 0) burden[i] += (sev * o) / HOUR;
      }
    } else if (e.type === 'stool') {
      if (sym !== undefined) continue;
      if (outcome.group && outcome.group !== 'Bowel') continue;
      const i = Math.floor((e.start - t0) / HOUR);
      if (i >= 0 && i < n) burden[i] += stoolWeight(e.bristol, e.tags);
    }
  }

  const hod = new Uint8Array(n);
  const pb = new Float64Array(n + 1);
  const pu = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const s = t0 + i * HOUR;
    hod[i] = new Date(s).getHours();
    const usable = s + HOUR <= now && logged.has(startOfDay(s));
    pb[i + 1] = pb[i] + burden[i];
    pu[i + 1] = pu[i] + (usable ? 0 : 1);
  }
  return { t0, n, burden, hod, pb, pu };
}

/** Ingredient id to sorted, unique exposure bins (food and drink entries only). */
export function exposureBins(entries: Entry[], grid: HourGrid): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const e of entries) {
    if ((e.type !== 'food' && e.type !== 'drink') || !e.ingredientIds) continue;
    const i = Math.floor((e.start - grid.t0) / HOUR);
    if (i < 0 || i >= grid.n) continue;
    for (const id of e.ingredientIds) {
      const list = out.get(id);
      if (list) list.push(i);
      else out.set(id, [i]);
    }
  }
  for (const [id, list] of out) out.set(id, [...new Set(list)].sort((a, b) => a - b));
  return out;
}

/** For each bin i: the burden summed over bins [i + from, i + to), and whether that whole span is usable. */
export function windowSums(grid: HourGrid, from: number, to: number) {
  const sum = new Float64Array(grid.n);
  const valid = new Uint8Array(grid.n);
  for (let i = 0; i < grid.n; i++) {
    const a = i + from;
    const b = i + to;
    if (b > grid.n || grid.pu[b] - grid.pu[a] !== 0) continue;
    valid[i] = 1;
    sum[i] = grid.pb[b] - grid.pb[a];
  }
  return { sum, valid };
}

/** Keeps the first of any exposures closer together than `gap` bins (measured from the last one kept). */
export function mergeClose(bins: number[], gap: number): number[] {
  const out: number[] = [];
  for (const b of bins) if (!out.length || b - out[out.length - 1] >= gap) out.push(b);
  return out;
}
