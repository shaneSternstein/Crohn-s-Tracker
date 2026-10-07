import type { Entry, Item } from '../../domain/types';

export function labelOf(e: Entry, items: Map<number, Item>): string {
  const item = e.itemId !== undefined ? items.get(e.itemId) : undefined;
  switch (e.type) {
    case 'food':
    case 'drink':
      return `${item?.name ?? 'Item'}${e.modified ? ' (modified)' : ''}`;
    case 'medication':
      return [item?.name ?? 'Medication', e.dose].filter(Boolean).join(' ');
    case 'stool':
      return [`Bristol ${e.bristol ?? '?'}`, ...(e.tags ?? [])].join(', ');
    default:
      return e.severity ? `${e.label} ${e.severity}/5` : (e.label ?? '');
  }
}
