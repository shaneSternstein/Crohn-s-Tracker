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

/** Start-time presets for quick entry, as minutes before now (0 = now). */
export const START_PRESETS = [
  { label: 'Now', minutes: 0 },
  { label: '15m ago', minutes: 15 },
  { label: '30m ago', minutes: 30 },
  { label: '1h ago', minutes: 60 },
  { label: '2h ago', minutes: 120 },
] as const;

export const presetToTime = (minutes: number, now = Date.now()) => now - minutes * MIN;
