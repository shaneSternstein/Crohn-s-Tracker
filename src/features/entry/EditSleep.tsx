import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { deleteSleep } from '../../db/repo';
import { ErrorText, Screen } from '../../ui/bits';
import { useSaving } from '../../ui/useSaving';
import SleepEntry from './SleepEntry';

export default function EditSleep() {
  const { id } = useParams();
  const nav = useNavigate();
  const [gone, setGone] = useState(false);
  const { busy, error, run } = useSaving();
  // undefined = loading, null = not found
  const log = useLiveQuery(async () => (await db.sleep.get(Number(id))) ?? null, [id]);
  const back = () => nav(-1);

  if (gone) return null;
  if (log === undefined) return <Screen title="Edit sleep" onBack={back}><p className="empty">Loading…</p></Screen>;
  if (log === null) return <Navigate to="/timeline" replace />;

  const remove = async () => {
    if (!window.confirm('Delete this sleep entry?')) return;
    setGone(true);
    try {
      await deleteSleep(log.id!);
      back();
    } catch (e) {
      setGone(false);
      throw e;
    }
  };

  return (
    <Screen title="Edit sleep" onBack={back}>
      <SleepEntry key={log.id} log={log} onDone={back} />
      <button className="btn ghost" disabled={busy} onClick={() => run(remove)}>Delete entry</button>
      <ErrorText message={error} />
    </Screen>
  );
}
