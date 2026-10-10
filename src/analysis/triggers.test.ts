import { describe, expect, it } from 'vitest';
import type { Entry } from '../domain/types';
import type { Cell } from './stage1';
import { exposureList, isOutcomeKey, loggedDayCount, outcomeFromKey, rankTriggers, symptomCounts } from './triggers';

const H = 3_600_000;
const cell = (ingredientId: number, window: Cell['window'], p: Partial<Cell>): Cell => ({ ingredientId, window, n: 8, reliability: 'none', ...p });

describe('rankTriggers', () => {
  it('orders by reliability first, then size of increase, and counts ingredients needing data', () => {
    const { rows, needMore } = rankTriggers([
      cell(1, '8-24h', { effect: 2, reliability: 'strong' }),
      cell(2, '0-3h', { effect: 5, reliability: 'weak' }),
      cell(3, '0-3h', { effect: -1, reliability: 'moderate' }),
      cell(4, '0-3h', { n: 2, reliability: 'insufficient' }),
      cell(4, '3-8h', { n: 3, reliability: 'insufficient' }),
    ]);
    expect(rows.map((r) => r.ingredientId)).toEqual([1, 2]);
    expect(needMore).toBe(1);
  });

  it('picks the most reliable window for an ingredient', () => {
    const { rows } = rankTriggers([
      cell(1, '0-3h', { effect: 9, reliability: 'weak' }),
      cell(1, '8-24h', { effect: 2, reliability: 'strong' }),
    ]);
    expect(rows[0].window).toBe('8-24h');
  });
});

describe('outcome keys', () => {
  it('maps keys to outcomes', () => {
    expect(isOutcomeKey('Pain')).toBe(true);
    expect(isOutcomeKey('x')).toBe(false);
    expect(outcomeFromKey('all')).toEqual({});
    expect(outcomeFromKey('Bowel')).toEqual({ group: 'Bowel' });
  });
});

describe('exposureList', () => {
  const t = new Date(2026, 0, 5, 12).getTime();
  const food = (start: number, ids: number[]): Entry => ({ type: 'food', start, ongoing: false, itemId: 1, ingredientIds: ids });
  const pain = (start: number): Entry => ({ type: 'symptom', start, ongoing: false, label: 'Pain', severity: 3 });

  it('lists exposures newest first with symptoms in the next 48 hours', () => {
    const entries = [food(t, [1]), food(t + 100 * H, [1]), food(t + 5 * H, [2]), pain(t + 3 * H), pain(t + 50 * H)];
    const list = exposureList(entries, 1, {});
    expect(list.map((x) => x.entry.start)).toEqual([t + 100 * H, t]);
    expect(list[1].followups.map((f) => f.hoursAfter)).toEqual([3]);
    expect(list[0].followups).toEqual([]);
  });

  it('counts days with food or drink', () => {
    expect(loggedDayCount([food(t, [1]), food(t + H, [1]), pain(t + 30 * H)])).toBe(1);
  });
});

describe('single symptom outcomes', () => {
  it('maps s: keys to a symptom outcome', () => {
    expect(isOutcomeKey('s:Gas')).toBe(true);
    expect(isOutcomeKey('s:')).toBe(false);
    expect(outcomeFromKey('s:Gas')).toEqual({ symptom: 'Gas' });
  });
  it('lists symptoms with enough entries', () => {
    const e = (label: string): Entry => ({ type: 'symptom', start: 1, ongoing: false, label, severity: 2 });
    const entries = [...Array(10).fill(0).map(() => e('Gas')), ...Array(3).fill(0).map(() => e('Pain'))];
    expect(symptomCounts(entries)).toEqual([{ label: 'Gas', count: 10 }]);
  });
});
