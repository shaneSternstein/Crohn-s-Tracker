import { useEffect, useState } from 'react';
import { exportBackup, inspectBackup, lastBackupAt, restoreBackup } from '../../lib/backup';
import { Screen } from '../../ui/bits';

export default function Settings() {
  const [last, setLast] = useState(lastBackupAt());
  const [msg, setMsg] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const doExport = async () => {
    try {
      const r = await exportBackup();
      setLast(lastBackupAt());
      setMsg(r === 'cancelled' ? '' : 'Backup saved.');
    } catch (e) {
      setMsg(`Export failed: ${(e as Error).message}`);
    }
  };

  const doImport = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const info = inspectBackup(raw);
      const when = new Date(info.exportedAt).toLocaleString();
      if (!window.confirm(`Replace all data in this app with the backup from ${when} (${info.entries} entries)? This can't be undone.`)) return;
      await restoreBackup(raw);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(e instanceof SyntaxError ? 'This file is not a Tracker backup.' : (e as Error).message);
    }
  };

  return (
    <Screen title="Settings">
      <section className="section">
        <h2>Backup</h2>
        <p className="empty">{last ? `Last backup: ${new Date(last).toLocaleString()}` : 'No backup yet.'}</p>
        <button className="btn" onClick={doExport}>Export backup</button>
        <label className="btn ghost">
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) doImport(f);
            }}
          />
        </label>
        {msg && <p role="status">{msg}</p>}
      </section>

      <section className="section">
        <h2>Storage</h2>
        <p className="empty">
          Your data lives only on this device. Install the app (browser menu, Install app or Add to Home screen) so the browser does not clear it automatically.
        </p>
        <p>Persistent storage: {persisted === null ? 'unknown' : persisted ? 'granted' : 'not granted'}</p>
        {persisted === false && (
          <button className="btn ghost" onClick={() => navigator.storage.persist().then(setPersisted)}>Request persistent storage</button>
        )}
      </section>
    </Screen>
  );
}
