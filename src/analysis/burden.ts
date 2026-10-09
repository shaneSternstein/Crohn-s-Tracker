import { BRISTOL_INFO } from '../domain/bristol';
import type { Bristol, Entry } from '../domain/types';
import { HOUR, dayRange, startOfDay } from '../lib/time';

/* ---------- Tunable constants ---------- */

/** Symptom burden = severity x hours covered. Instant entries count this many hours. */
export const INSTANT_HOURS = 1;
/** A single symptom entry counts at most this many hours. */
export const MAX_SYMPTOM_HOURS = 6;

export const BRISTOL_WEIGHT: Record<Bristol, number> = { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 2, 7: 3 };
/** Keys are lowercase tag labels. Tags not listed weigh 0. */
export const TAG_WEIGHT: Record<string, number> = { blood: 3, urgency: 1, mucus: 1, incomplete: 1 };

export const SYMPTOM_GROUPS = ['Pain', 'Digestive', 'Systemic', 'Other'] as const;
export type SymptomGroup = (typeof SYMPTOM_GROUPS)[number];
/** Keys are lowercase symptom labels. Anything not listed is 'Other'. */
const GROUP_OF: Record<string, SymptomGroup> = {
  pain: 'Pain',
  cramping: 'Pain',
  nausea: 'Digestive',
  reflux: 'Digestive',
  bloating: 'Digestive',
  gas: 'Digestive',
  fatigue: 'Systemic',
  headache: 'Systemic',
  'joint pain': 'Systemic',
};
export const groupOf = (label?: string): SymptomGroup => GROUP_OF[(label ?? '').trim().toLowerCase()] ?? 'Other';

export const BOWEL_GROUPS = ['Constipated', 'Normal', 'Low fiber', 'Loose'] as const;
export type BowelGroup = (typeof BOWEL_GROUPS)[number];
export const bowelGroup = (b: Bristol) => BRISTOL_INFO[b].group as BowelGroup;

/* ---------- Scoring ---------- */

export function stoolWeight(bristol?: Bristol, tags: string[] = []): number {
  const base = bristol !== undefined ? BRISTOL_WEIGHT[bristol] : 0;
  return base + tags.reduce((sum, t) => sum + (TAG_WEIGHT[t.trim().toLowerCase()] ?? 0), 0);
}

/** The time span a symptom entry is scored over, after the instant rule and the hour cap. */
export function symptomSpan(e: Entry, now: number): [number, number] {
  const natural = e.ongoing ? Math.max(now, e.start + INSTANT_HOURS * HOUR) : (e.end ?? e.start + INSTANT_HOURS * HOUR);
  return [e.start, Math.min(natural, e.start + MAX_SYMPTOM_HOURS * HOUR)];
}

export interface DayStats {
  day: number; // local midnight, epoch ms
  /** Any entry touches this day. */
  hasData: boolean;
  /** At least one food or drink entry. Only logged days are used by the correlation engine. */
  logged: boolean;
  bowel: Record<BowelGroup, number>; // stool events by Bristol group
  bowelCount: number;
  symptom: Record<SymptomGroup, number>; // burden by group
  symptomTotal: number;
  stoolBurden: number;
  /** symptomTotal + stoolBurden. Used for the heatmap. */
  total: number;
}

function zero<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

const blank = (day: number): DayStats => ({
  day,
  hasData: false,
  logged: false,
  bowel: zero(BOWEL_GROUPS),
  bowelCount: 0,
  symptom: zero(SYMPTOM_GROUPS),
  symptomTotal: 0,
  stoolBurden: 0,
  total: 0,
});

/** One DayStats per day in `days` (local midnights). Entries outside the days are ignored. */
export function dailyStats(entries: Entry[], days: number[], now = Date.now()): DayStats[] {
  const stats = days.map(blank);
  const index = new Map(days.map((d, i) => [d, i] as const));

  for (const e of entries) {
    const home = index.get(startOfDay(e.start));

    if (e.type === 'symptom') {
      const [start, end] = symptomSpan(e, now);
      const group = groupOf(e.label);
      for (let d = startOfDay(start); d < end; ) {
        const next = dayRange(d)[1];
        const i = index.get(d);
        if (i !== undefined) {
          const burden = (e.severity ?? 1) * ((Math.min(end, next) - Math.max(start, d)) / HOUR);
          const s = stats[i];
          s.hasData = true;
          s.symptom[group] += burden;
          s.symptomTotal += burden;
          s.total += burden;
        }
        d = next;
      }
    } else if (home !== undefined) {
      const s = stats[home];
      s.hasData = true;
      if (e.type === 'food' || e.type === 'drink') s.logged = true;
      if (e.type === 'stool') {
        if (e.bristol !== undefined) {
          s.bowel[bowelGroup(e.bristol)] += 1;
          s.bowelCount += 1;
        }
        const w = stoolWeight(e.bristol, e.tags);
        s.stoolBurden += w;
        s.total += w;
      }
    }
  }
  return stats;
}

/** Trailing mean over the last `window` values, ignoring nulls (days with no data). Null if none. */
export function movingAverage(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const xs = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  });
}
