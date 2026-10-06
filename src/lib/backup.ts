import { db } from '../db/schema';

const APP = 'tracker';
const LAST = 'tracker:lastBackup';
const INSTALLED = 'tracker:installedAt';
const WEEK = 7 * 86_400_000;

export interface Backup {
  app: string;
  dbVersion: number;
  exportedAt: number;
  tables: Record<string, unknown[]>;
}

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

/** Includes every Dexie table, so tables added in later phases are backed up automatically. */
export async function buildBackup(): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of db.tables) tables[t.name] = await t.toArray();
  return { app: APP, dbVersion: db.verno, exportedAt: Date.now(), tables };
}

function parse(raw: unknown): Backup {
  const b = raw as Partial<Backup> | null;
  if (!b || b.app !== APP || typeof b.tables !== 'object' || b.tables === null) {
    throw new Error('This file is not a Tracker backup.');
  }
  if (typeof b.dbVersion !== 'number' || b.dbVersion > db.verno) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  return b as Backup;
}

export function inspectBackup(raw: unknown) {
  const b = parse(raw);
  return { exportedAt: b.exportedAt, entries: b.tables.entries?.length ?? 0 };
}

/** Replaces all data with the backup's contents, atomically. */
export async function restoreBackup(raw: unknown): Promise<void> {
  const b = parse(raw);
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear();
      const rows = b.tables[t.name];
      if (Array.isArray(rows) && rows.length) await t.bulkAdd(rows);
    }
  });
}

export const lastBackupAt = () => Number(store.get(LAST)) || null;
const markBackedUp = () => store.set(LAST, String(Date.now()));
export const ensureInstalledStamp = () => { if (!store.get(INSTALLED)) store.set(INSTALLED, String(Date.now())); };
export const backupDue = () => Date.now() - (lastBackupAt() ?? (Number(store.get(INSTALLED)) || Date.now())) > WEEK;

/** Shares the backup via the system share sheet when possible, otherwise downloads it. */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([JSON.stringify(await buildBackup())], { type: 'application/json' });
  const name = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tracker backup' });
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      throw e;
    }
    markBackedUp();
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  markBackedUp();
  return 'downloaded';
}
