import { backfillSnapshots } from '../db/repo';
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
  await backfillSnapshots();
}

export const lastBackupAt = () => Number(store.get(LAST)) || null;
const markBackedUp = () => store.set(LAST, String(Date.now()));
export const ensureInstalledStamp = () => { if (!store.get(INSTALLED)) store.set(INSTALLED, String(Date.now())); };
export const backupDue = () => Date.now() - (lastBackupAt() ?? (Number(store.get(INSTALLED)) || Date.now())) > WEEK;

/** Builds the file ahead of the tap so sharing starts inside the user gesture. */
export async function makeBackupFile(): Promise<File> {
  const name = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new File([JSON.stringify(await buildBackup())], name, { type: 'application/json' });
}

export const canShareFile = (f: File) => !!navigator.canShare?.({ files: [f] });

/** Returns false if the user dismissed the share sheet. Throws on other failures. */
export async function shareBackup(f: File): Promise<boolean> {
  try {
    await navigator.share({ files: [f], title: 'Tracker backup' });
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return false;
    throw e;
  }
  markBackedUp();
  return true;
}

export function downloadBackup(f: File): void {
  const url = URL.createObjectURL(f);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  markBackedUp();
}
