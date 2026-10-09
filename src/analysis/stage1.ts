import type { Entry } from '../domain/types';
import { benjaminiHochberg, mulberry32 } from './stats';
import { LAG_WINDOWS, buildGrid, exposureBins, mergeClose, windowSums, type HourGrid, type LagWindow, type Outcome } from './windows';

/** Minimum exposures (after merging repeats and dropping unusable ones) before a result is shown. */
export const MIN_EXPOSURES = 6;
/** Minimum unexposed comparison windows at the same hour of day. */
export const MIN_POOL = 5;
export const PERMUTATIONS = 2000;
const SEED = 20261008;

export type Reliability = 'insufficient' | 'none' | 'weak' | 'moderate' | 'strong';

/** Reliability from sample size and the corrected p-value (q). These are associations, not causes. */
export function reliabilityOf(n: number, q: number): Reliability {
  if (q <= 0.05 && n >= 10) return 'strong';
  if (q <= 0.1) return 'moderate';
  if (q <= 0.25) return 'weak';
  return 'none';
}

export interface Cell {
  ingredientId: number;
  window: LagWindow['key'];
  n: number; // exposures used
  exposedMean?: number; // mean burden in the window after exposure
  baselineMean?: number; // mean burden in matched unexposed windows (same hour of day)
  effect?: number; // exposedMean - baselineMean; positive = more burden after exposure
  p?: number; // Monte Carlo p-value, two-sided
  q?: number; // Benjamini-Hochberg corrected across all ingredient x window cells
  reliability: Reliability;
}

function analyze(
  ingredientId: number, bins: number[], w: LagWindow, grid: HourGrid,
  sum: Float64Array, valid: Uint8Array, permutations: number, rnd: () => number,
): Cell {
  const len = w.to - w.from;
  const merged = mergeClose(bins, len);
  const none = (n: number): Cell => ({ ingredientId, window: w.key, n, reliability: 'insufficient' });
  if (merged.length < MIN_EXPOSURES) return none(merged.length);

  // Comparison windows: usable, and not within one window length of any exposure to this ingredient.
  const blocked = new Uint8Array(grid.n);
  for (const e of bins) {
    for (let j = Math.max(0, e - len + 1); j <= Math.min(grid.n - 1, e + len - 1); j++) blocked[j] = 1;
  }
  const pools: number[][] = Array.from({ length: 24 }, () => []);
  for (let j = 0; j < grid.n; j++) if (valid[j] && !blocked[j]) pools[grid.hod[j]].push(sum[j]);
  const means = pools.map((p) => (p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0));

  const kept = merged.filter((e) => valid[e] && pools[grid.hod[e]].length >= MIN_POOL);
  const n = kept.length;
  if (n < MIN_EXPOSURES) return none(n);

  let exposed = 0;
  let base = 0;
  for (const e of kept) {
    exposed += sum[e];
    base += means[grid.hod[e]];
  }
  const exposedMean = exposed / n;
  const baselineMean = base / n;
  const effect = exposedMean - baselineMean;

  // Null: each exposure's outcome is a random draw from unexposed windows at the same hour of day.
  let extreme = 0;
  for (let b = 0; b < permutations; b++) {
    let s = 0;
    for (const e of kept) {
      const h = grid.hod[e];
      const pool = pools[h];
      s += pool[Math.floor(rnd() * pool.length)] - means[h];
    }
    if (Math.abs(s / n) >= Math.abs(effect) - 1e-12) extreme++;
  }
  const p = (extreme + 1) / (permutations + 1);
  return { ingredientId, window: w.key, n, exposedMean, baselineMean, effect, p, reliability: 'none' };
}

/**
 * Stage 1: for every ingredient and lag window, compares burden after exposure with burden at the same
 * hour of day on unexposed occasions. Pure and deterministic (seeded). Cells that cannot be estimated
 * have reliability 'insufficient'.
 */
export function runStage1(
  entries: Entry[], outcome: Outcome = {}, now = Date.now(),
  opts: { permutations?: number; seed?: number } = {},
): Cell[] {
  const grid = buildGrid(entries, outcome, now);
  if (!grid) return [];
  const exposures = exposureBins(entries, grid);
  const rnd = mulberry32(opts.seed ?? SEED);
  const B = opts.permutations ?? PERMUTATIONS;
  const cells: Cell[] = [];
  for (const w of LAG_WINDOWS) {
    const { sum, valid } = windowSums(grid, w.from, w.to);
    for (const [id, bins] of exposures) cells.push(analyze(id, bins, w, grid, sum, valid, B, rnd));
  }
  const idx = cells.flatMap((c, i) => (c.p !== undefined ? [i] : []));
  const q = benjaminiHochberg(idx.map((i) => cells[i].p!));
  idx.forEach((ci, k) => {
    cells[ci].q = q[k];
    cells[ci].reliability = reliabilityOf(cells[ci].n, q[k]);
  });
  return cells;
}

/** One row per ingredient: its cell with the largest increase in burden. Only increases, strongest first. */
export function topTriggers(cells: Cell[]): Cell[] {
  const best = new Map<number, Cell>();
  for (const c of cells) {
    if (c.effect === undefined || c.effect <= 0) continue;
    const cur = best.get(c.ingredientId);
    if (!cur || c.effect > cur.effect!) best.set(c.ingredientId, c);
  }
  return [...best.values()].sort((a, b) => b.effect! - a.effect!);
}
