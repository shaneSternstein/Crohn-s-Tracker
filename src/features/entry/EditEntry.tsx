import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { deleteEntry } from '../../db/repo';
import { Screen } from '../../ui/bits';
import EventEntry from './EventEntry';
import ItemEntryEdit from './ItemEntryEdit';

export default function EditEntry() {
  const { id } = useParams();
  const nav = useNavigate();
  const [gone, setGone] = useState(false);
  // undefined = loading, null = not found
  const entry = useLiveQuery(async () => (await db.entries.get(Number(id))) ?? null, [id]);
  const back = () => nav(-1);

  if (gone) return null;
  if (entry === undefined) return <Screen title="Edit entry" onBack={back}><p className="empty">Loading…</p></Screen>;
  if (entry === null) return <Navigate to="/timeline" replace />;

  const remove = async () => {
    if (!window.confirm('Delete this entry?')) return;
    setGone(true);
    await deleteEntry(entry.id!);
    back();
  };

  return (
    <Screen title={`Edit ${entry.type}`} onBack={back}>
      {entry.type === 'food' || entry.type === 'drink' || entry.type === 'medication' ? (
        <ItemEntryEdit key={entry.id} entry={entry} onDone={back} />
      ) : (
        <EventEntry key={entry.id} type={entry.type} entry={entry} onDone={back} />
      )}
      <button className="btn ghost" onClick={remove}>Delete entry</button>
    </Screen>
  );
}
