import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { addPreset, logFood, presetsOf, renamePreset, reorderPresets, saveItem } from './repo';

beforeEach(async () => {
  for (const t of db.tables) await t.clear();
});

describe('items and entries', () => {
  it('rejects duplicate item names', async () => {
    await saveItem({ kind: 'food', name: 'Salad', lines: [{ name: 'lettuce' }] });
    await expect(saveItem({ kind: 'food', name: ' salad ', lines: [] })).rejects.toThrow(/already exists/);
  });

  it('keeps a per-entry ingredient copy when the item changes later', async () => {
    const id = await saveItem({ kind: 'food', name: 'Salad', lines: [{ name: 'lettuce' }, { name: 'onion' }] });
    await logFood({ type: 'food', start: 1, itemId: id, lines: [{ name: 'lettuce' }], modified: true });
    await saveItem({ kind: 'food', name: 'Salad', lines: [{ name: 'kale' }] }, id);
    const e = (await db.entries.toArray())[0];
    expect(e.modified).toBe(true);
    expect(e.components).toHaveLength(1);
    expect(e.ingredientIds).toHaveLength(1);
  });
});

describe('chips', () => {
  it('reorders and renames, including past entries', async () => {
    const pain = await addPreset('symptom', 'Pain');
    const gas = await addPreset('symptom', 'Gas');
    await reorderPresets([gas, pain]);
    expect((await presetsOf('symptom')).map((p) => p.label)).toEqual(['Gas', 'Pain']);
    await db.entries.add({ type: 'symptom', start: 1, ongoing: false, label: 'Pain' });
    await renamePreset(pain, 'Abdominal pain', true);
    expect((await db.entries.toArray())[0].label).toBe('Abdominal pain');
  });
});
