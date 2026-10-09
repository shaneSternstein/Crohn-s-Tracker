import { describe, expect, it } from 'vitest';
import type { Entry } from '../domain/types';
import { benjaminiHochberg } from './stats';
import { MIN_EXPOSURES, reliabilityOf, runStage1, topTriggers } from './stage1';
import { makeSynthetic } from './synthetic';
import { buildGrid, mergeClose, windowSums } from './windows';

const at = (d: number, h: number, m = 0) => new Date(2026, 0, d, h, m).getTime();

describe('benjaminiHochberg', () => {
  it('adjusts p-values and keeps input order', () => {
    const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.005]);
    [0.02, 0.04, 0.04, 0.02].forEach((v, i) => expect(q[i]).toBeCloseTo(v));
  });
});

describe('mergeClose', () => {
  it('keeps the first of exposures closer than the gap', () => {
    expect(mergeClose([0, 2, 5, 6, 12], 3)).toEqual([0, 5, 12]);
  });
});

describe('hourly grid', () => {
  const food: Entry = { type: 'food', start: at(1, 8), ongoing: false, itemId: 1, ingredientIds: [1] };
  const symptom: Entry = { type: 'symptom', start: at(1, 10, 30), end: at(1, 12, 30), ongoing: false, label: 'Pain', severity: 2 };

  it('spreads a symptom across hour bins (severity x hours)', () => {
    const g = buildGrid([food, symptom], {}, at(3, 0))!;
    const total = Array.from(g.burden).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(4);
    expect(g.burden[10]).toBeCloseTo(1);
    expect(g.burden[11]).toBeCloseTo(2);
  });

  it('filters by outcome', () => {
    const g = buildGrid([food, symptom], { group: 'Digestive' }, at(3, 0))!;
    expect(Array.from(g.burden).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('marks days without food or drink unusable', () => {
    const g = buildGrid([food, symptom], {}, at(3, 0))!;
    const { valid } = windowSums(g, 0, 3);
    expect(valid[8]).toBe(1); // day 1 has food
    expect(valid[24 + 8]).toBe(0); // day 2 has none
  });
});

describe('runStage1 on synthetic data', () => {
  const days = 90;
  const entries = makeSynthetic({ days });
  const now = new Date(2026, 0, 1 + days).getTime();
  const cells = runStage1(entries, {}, now);
  const planted = cells.find((c) => c.ingredientId === 1 && c.window === '8-24h')!;

  it('finds the planted trigger in the right window', () => {
    expect(planted.reliability).not.toBe('insufficient');
    expect(planted.effect!).toBeGreaterThan(1);
    expect(planted.q!).toBeLessThan(0.05);
    expect(['moderate', 'strong']).toContain(planted.reliability);
  });

  it('shows no comparable effect in windows before the lag', () => {
    const early = cells.find((c) => c.ingredientId === 1 && c.window === '0-3h')!;
    expect(early.effect ?? 0).toBeLessThan(planted.effect! / 2);
  });

  it('ranks the planted ingredient first', () => {
    expect(topTriggers(cells)[0].ingredientId).toBe(1);
  });

  it('is repeatable', () => {
    const again = runStage1(entries, {}, now);
    expect(again.find((c) => c.ingredientId === 1 && c.window === '8-24h')!.p).toBe(planted.p);
  });

  it('reports insufficient data for rare ingredients', () => {
    const few = makeSynthetic({ days: 90, plantedProb: 0.02 });
    const c = runStage1(few, {}, now).find((x) => x.ingredientId === 1 && x.window === '8-24h')!;
    expect(c.n).toBeLessThan(MIN_EXPOSURES);
    expect(c.reliability).toBe('insufficient');
  });
});

describe('reliabilityOf', () => {
  it('combines sample size and corrected significance', () => {
    expect(reliabilityOf(12, 0.01)).toBe('strong');
    expect(reliabilityOf(7, 0.01)).toBe('moderate');
    expect(reliabilityOf(12, 0.2)).toBe('weak');
    expect(reliabilityOf(12, 0.6)).toBe('none');
  });
});
