import type { Entry } from '../domain/types';
import { mulberry32 } from './stats';

export interface SyntheticOptions {
  days?: number;
  seed?: number;
  ingredients?: number; // ids 1..ingredients
  plantedId?: number; // the trigger
  plantedProb?: number; // chance it is in a given lunch
  lag?: [number, number]; // hours after lunch the planted symptom starts
}

/** Test data with a known trigger: the planted ingredient (in lunch) causes Pain 8 to 12 h later. Never mixed with real data. */
export function makeSynthetic(o: SyntheticOptions = {}): Entry[] {
  const { days = 90, seed = 7, ingredients = 12, plantedId = 1, plantedProb = 0.3, lag = [8, 12] } = o;
  const rnd = mulberry32(seed);
  const others = Array.from({ length: ingredients }, (_, i) => i + 1).filter((i) => i !== plantedId);
  const pick = (k: number) => [...others].sort(() => rnd() - 0.5).slice(0, k);
  const out: Entry[] = [];
  for (let d = 0; d < days; d++) {
    const at = (h: number, m = 0) => new Date(2026, 0, 1 + d, h, m).getTime();
    const meals: [number, number][] = [[8, 2], [12, 3], [18, 3]];
    for (const [h, k] of meals) {
      const ids = pick(k);
      const planted = h === 12 && rnd() < plantedProb;
      if (planted) ids.push(plantedId);
      const start = at(h, Math.floor(rnd() * 30));
      out.push({ type: 'food', start, ongoing: false, itemId: 1, ingredientIds: ids });
      if (planted && rnd() < 0.9) {
        const delay = (lag[0] + rnd() * (lag[1] - lag[0])) * 3_600_000;
        out.push({ type: 'symptom', start: start + delay, ongoing: false, label: 'Pain', severity: 4 });
      }
    }
    if (rnd() < 0.2) out.push({ type: 'symptom', start: at(Math.floor(rnd() * 24)), ongoing: false, label: 'Gas', severity: 2 });
    if (rnd() < 0.1) out.push({ type: 'stool', start: at(Math.floor(rnd() * 24)), ongoing: false, bristol: 6 });
  }
  return out;
}
