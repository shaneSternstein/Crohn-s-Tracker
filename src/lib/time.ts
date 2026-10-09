export const MIN = 60_000;
export const HOUR = 60 * MIN;

export function startOfDay(t: number | Date = Date.now()): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayRange(t: number | Date = Date.now()): [number, number] {
  const from = startOfDay(t);
  const d = new Date(from);
  d.setDate(d.getDate() + 1); // DST-safe
  return [from, d.getTime()];
}

/** Day starts for the `count` days ending at the day of `t`, oldest first. DST-safe. */
export function daysEnding(count: number, t: number | Date = Date.now()): number[] {
  const out: number[] = [];
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() - (count - 1));
  for (let i = 0; i < count; i++) {
    out.push(d.getTime());
    d.setDate(d.getDate() + 1);
  }
  return out;
}
