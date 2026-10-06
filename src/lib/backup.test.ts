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
