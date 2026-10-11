import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { buildBackup, restoreBackup } from './backup';

describe('backup', () => {
  it('round-trips all tables', async () => {
    await db.entries.add({ type: 'symptom', start: 1, ongoing: false, label: 'Pain' });
    await db.ingredients.add({ name: 'rice', nameKey: 'rice' });
    const file = JSON.parse(JSON.stringify(await buildBackup()));
    await db.entries.clear();
    await db.ingredients.clear();
    await restoreBackup(file);
    expect(await db.entries.count()).toBe(1);
    expect((await db.ingredients.toArray())[0].name).toBe('rice');
  });
  it('rejects other files', async () => {
    await expect(restoreBackup({ app: 'other' })).rejects.toThrow();
    await expect(restoreBackup({ app: 'tracker', dbVersion: 99, tables: {} })).rejects.toThrow();
  });
});

describe('old backups', () => {
  it('folds quantities into notes on restore', async () => {
    const file = {
      app: 'tracker', dbVersion: 3, exportedAt: 1,
      tables: {
        ingredients: [{ id: 1, name: 'flour', nameKey: 'flour' }],
        items: [{ id: 1, kind: 'food', name: 'Bread', components: [{ ingredientId: 1, qty: 2, unit: 'cup', note: 'sifted' }], ingredientIds: [1], createdAt: 1, lastUsedAt: 1, useCount: 0 }],
      },
    };
    await restoreBackup(file);
    const item = (await db.items.toArray())[0];
    expect(item.components[0]).toEqual({ ingredientId: 1, note: '2 cup, sifted' });
  });
});
