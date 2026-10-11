import type { Component } from './types';

/** Older data stored an amount and unit on each ingredient line. They now live in the note as text. */
export type LegacyComponent = Component & { qty?: number; unit?: string };

export function foldQuantity(c: LegacyComponent): Component {
  const { qty, unit, ...rest } = c;
  if (qty === undefined && unit === undefined) return rest;
  const amount = [qty !== undefined ? String(Math.round(qty * 100) / 100) : '', unit?.replace('_', ' ')].filter(Boolean).join(' ');
  const note = [amount, rest.note].filter(Boolean).join(', ');
  return note ? { ...rest, note } : rest;
}

/** Applies foldQuantity to a stored item or entry row. Rows without components are returned unchanged. */
export function foldRow<T extends { components?: LegacyComponent[] }>(row: T): T {
  return Array.isArray(row.components) ? { ...row, components: row.components.map(foldQuantity) } : row;
}
