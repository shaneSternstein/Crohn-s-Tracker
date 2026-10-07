import { useEffect, useState } from 'react';
import { canShareFile, downloadBackup, inspectBackup, lastBackupAt, makeBackupFile, restoreBackup, shareBackup } from '../../lib/backup';
import { Screen } from '../../ui/bits';

const errText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : 'Unknown error.');

export default function Settings() {
  const [last, setLast] = useState(lastBackupAt());
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted);
    makeBackupFile().then(setFile).catch((e) => setMsg(`Could not prepare backup. ${errText(e)}`));
  }, []);

  const download = () => {
    try {
      downloadBackup(file!);
      setLast(lastBackupAt());
      setMsg('Backup downloaded. Check your Downloads folder.');
    } catch (e) {
      setMsg(`Download failed. ${errText(e)}`);
    }
  };

  const share = async () => {
    try {
      if (await shareBackup(file!)) {
        setLast(lastBackupAt());
        setMsg('Backup shared.');
      }
    } catch (e) {
      setMsg(`Share failed. Use Download instead. ${errText(e)}`);
    }
  };

  const restore = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      const info = inspectBackup(raw);
      const when = new Date(info.exportedAt).toLocaleString();
      if (!window.confirm(`Replace all data in this app with the backup from ${when} (${info.entries} entries)? This can't be undone.`)) return;
      await restoreBackup(raw);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(e instanceof SyntaxError ? 'This file is not a Tracker backup.' : `Import failed. ${errText(e)}`);
    }
  };

  return (
    <Screen title="Settings">
      <section className="section">
        <h2>Backup</h2>
        <p className="empty">{last ? `Last backup: ${new Date(last).toLocaleString()}` : 'No backup yet.'}</p>
        <button className="btn" disabled={!file} onClick={download}>Download backup</button>
        {file && canShareFile(file) && <button className="btn ghost" onClick={share}>Share backup</button>}
        <label className="btn ghost">
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) restore(f);
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
          <>
            <button
              className="btn ghost"
              onClick={async () => {
                const ok = await navigator.storage.persist();
                setPersisted(ok);
                if (!ok) setMsg('Denied by the browser. Install the app and use it regularly, then check again.');
              }}
            >
              Request persistent storage
            </button>
          </>
        )}
      </section>
    </Screen>
  );
}
