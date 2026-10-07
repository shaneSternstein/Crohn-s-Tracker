import Dexie, { type Table } from 'dexie';
import type { Entry, HydrationLog, Ingredient, Item, Preset, SleepLog } from '../domain/types';

export class TrackerDB extends Dexie {
  ingredients!: Table<Ingredient, number>;
  items!: Table<Item, number>;
  entries!: Table<Entry, number>;
  sleep!: Table<SleepLog, number>;
  hydration!: Table<HydrationLog, number>;
  presets!: Table<Preset, number>;

  constructor(name = 'tracker') {
    super(name);
    this.version(1).stores({
      ingredients: '++id, &nameKey',
      items: '++id, kind, barcode, name, lastUsedAt, *ingredientIds',
      entries: '++id, type, start, end',
      sleep: '++id, start',
      hydration: '++id, at',
      presets: '++id, type, &[type+label]',
    });
    // Bowel-related symptoms are captured by stool entries (Bristol type + tags).
    this.version(2).stores({}).upgrade((tx) =>
      tx.table('presets')
        .filter((p) => p.type === 'symptom' && ['Diarrhea', 'Constipation', 'Urgency'].includes(p.label))
        .delete(),
    );
  }
}

export const db = new TrackerDB();

// A second open copy of the app can block a schema upgrade, which makes saves hang.
db.on('blocked', () => window.alert('Another copy of this app is open. Close other tabs or windows of it, then reopen.'));
db.on('versionchange', () => {
  if (typeof location !== 'undefined') location.reload();
  return false;
});
