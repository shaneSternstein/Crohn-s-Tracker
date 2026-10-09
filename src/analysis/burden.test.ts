import { describe, expect, it } from 'vitest';
import type { Entry } from '../domain/types';
import { daysEnding } from '../lib/time';
import { dailyStats, groupOf, movingAverage, quartileCutoffs, shadeOf, stoolWeight } from './burden';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
const days = daysEnding(3, at(5, 12)); // Oct 3, 4, 5
const sym = (start: number, label: string, severity: 1 | 2 | 3 | 4 | 5, extra: Partial<Entry> = {}): Entry => ({
  type: 'symptom', start, ongoing: false, label, severity, ...extra,
});

describe('stoolWeight', () => {
  it('adds tag weights to the Bristol weight', () => {
    expect(stoolWeight(7, ['Blood'])).toBe(6);
    expect(stoolWeight(4)).toBe(0);
    expect(stoolWeight(2, ['mucus', 'Urgency', 'custom'])).toBe(3);
  });
});

describe('groupOf', () => {
  it('maps known labels and falls back to Other', () => {
    expect(groupOf('Joint pain')).toBe('Systemic');
    expect(groupOf('Dizzy')).toBe('Other');
  });
});

describe('dailyStats', () => {
  it('scores an instant symptom as severity x 1 hour', () => {
    const s = dailyStats([sym(at(5, 10), 'Pain', 4)], days, at(5, 20));
    expect(s[2].symptom.Pain).toBe(4);
    expect(s[2].total).toBe(4);
  });

  it('caps long and ongoing symptoms at 6 hours', () => {
    const s = dailyStats([sym(at(5, 2), 'Fatigue', 2, { ongoing: true })], days, at(5, 20));
    expect(s[2].symptom.Systemic).toBe(12);
  });

  it('splits a symptom across midnight', () => {
    const s = dailyStats([sym(at(4, 23), 'Gas', 2, { end: at(5, 1) })], days, at(5, 20));
    expect(s[1].symptom.Digestive).toBe(2);
    expect(s[2].symptom.Digestive).toBe(2);
  });

  it('counts stool events by Bristol group and adds burden', () => {
    const e: Entry = { type: 'stool', start: at(5, 8), ongoing: false, bristol: 7, tags: ['Blood'] };
    const s = dailyStats([e], days, at(5, 20));
    expect(s[2].bowel.Loose).toBe(1);
    expect(s[2].bowelCount).toBe(1);
    expect(s[2].stoolBurden).toBe(6);
    expect(s[2].total).toBe(6);
  });

  it('marks logged days only when food or drink exists', () => {
    const food: Entry = { type: 'food', start: at(4, 8), ongoing: false, itemId: 1 };
    const s = dailyStats([food, sym(at(5, 9), 'Pain', 1)], days, at(5, 20));
    expect(s.map((d) => d.hasData)).toEqual([false, true, true]);
    expect(s.map((d) => d.logged)).toEqual([false, true, false]);
  });
});

describe('movingAverage', () => {
  it('ignores nulls inside the window', () => {
    expect(movingAverage([1, null, 3], 2)).toEqual([1, 1, 3]);
    expect(movingAverage([null, null], 2)).toEqual([null, null]);
  });
});

describe('heatmap shading', () => {
  it('computes quartile cutoffs from non-zero days', () => {
    const cuts = quartileCutoffs([0, 0, 6, 9, 12, 12, 15, 18, 24, 30, 36, 45, 60, 84]);
    expect(cuts[0]).toBeCloseTo(12);
    expect(cuts[1]).toBeCloseTo(21);
    expect(cuts[2]).toBeCloseTo(38.25);
  });
  it('never goes below the default cutoffs', () => {
    expect(quartileCutoffs([2, 3, 4, 4, 5, 6, 8, 10, 12, 15, 20, 28])).toEqual([5, 10, 20]);
  });
  it('uses the defaults with too few days', () => {
    expect(quartileCutoffs([1, 2, 3])).toEqual([5, 10, 20]);
    expect(quartileCutoffs([])).toEqual([5, 10, 20]);
  });
  it('maps values to shades', () => {
    const cuts = [4, 7, 12.75] as const;
    expect([0, 4, 4.1, 7, 12, 20].map((v) => shadeOf(v, cuts))).toEqual([0, 1, 2, 2, 3, 4]);
  });
});
