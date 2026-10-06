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
  }
}

export const db = new TrackerDB();
