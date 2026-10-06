import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { addEntry, updateEntry } from '../../db/repo';
import { BRISTOL_INFO } from '../../domain/bristol';
import type { Bristol, Entry, Preset, Severity } from '../../domain/types';
import { MIN } from '../../lib/time';
import { Chips } from '../../ui/bits';
import { TimeField } from '../../ui/TimeField';

type Kind = 'symptom' | 'activity' | 'stool';
type EndMode = 'none' | 'ongoing' | 'at';
const BRISTOL: Bristol[] = [1, 2, 3, 4, 5, 6, 7];
const SEVERITY: Severity[] = [1, 2, 3, 4, 5];
const END_MODES: EndMode[] = ['none', 'ongoing', 'at'];
const END_LABEL: Record<EndMode, string> = { none: 'Instant', ongoing: 'Ongoing', at: 'Ends at' };
const toggle = <T,>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

interface Props {
  type: Kind;
  /** Present in edit mode: prefills the form and updates instead of adding. */
  entry?: Entry;
  onDone?: () => void;
}

/** Symptom, activity, and stool entry. Create mode logs all selected chips; edit mode is single-select. */
export default function EventEntry({ type, entry, onDone }: Props) {
  const nav = useNavigate();
  const editing = entry !== undefined;
  const isStool = type === 'stool';
  const single = editing && !isStool; // symptom/activity edits change one entry's label

  const [at, setAt] = useState<number | null>(entry?.start ?? null);
  const [endMode, setEndMode] = useState<EndMode>(entry ? (entry.ongoing ? 'ongoing' : entry.end !== undefined ? 'at' : 'none') : 'none');
  const [endAt, setEndAt] = useState<number | null>(entry?.end ?? null);
  const [picked, setPicked] = useState<string[]>(entry ? (isStool ? (entry.tags ?? []) : entry.label ? [entry.label] : []) : []);
  const [severity, setSeverity] = useState<Severity>(entry?.severity ?? 3);
  const [bristol, setBristol] = useState<Bristol | undefined>(entry?.bristol);
  const [custom, setCustom] = useState('');
  const presets = useLiveQuery(() => db.presets.where('type').equals(type).toArray(), [type], [] as Preset[]);

  const startMs = at ?? Date.now();
  const badEnd = endMode === 'at' && (endAt ?? Date.now()) <= startMs;

  const chooseEnd = (m: EndMode) => {
    setEndMode(m);
    if (m === 'at' && at === null) setAt(Date.now() - 15 * MIN); // default: a 15-minute event ending now
  };

  const addCustom = async () => {
    const label = custom.trim();
    if (!label) return;
    await db.presets.add({ type, label }).catch(() => undefined); // unique [type+label]
    setPicked((p) => (single ? [label] : p.includes(label) ? p : [...p, label]));
    setCustom('');
  };

  const save = async () => {
    const start = at ?? Date.now();
    const end = endMode === 'at' ? (endAt ?? Date.now()) : undefined;
    const sev = type === 'symptom' ? severity : undefined;

    if (entry) {
      await updateEntry(
        entry.id!,
        isStool
          ? { start, bristol, tags: picked }
          : { start, end, ongoing: endMode === 'ongoing', label: picked[0], severity: sev },
      );
    } else if (isStool) {
      await addEntry({ type, start, ongoing: false, bristol, tags: picked });
    } else {
      for (const label of picked) {
        await addEntry({ type, start, end, label, ongoing: endMode === 'ongoing', severity: sev });
      }
    }
    (onDone ?? (() => nav('/')))();
  };

  return (
    <>
      {isStool && (
        <>
          <h2>Bristol type</h2>
          <div className="bristol">
            {BRISTOL.map((n) => (
              <button key={n} type="button" className="brow" aria-pressed={bristol === n} onClick={() => setBristol(n)}>
                <b>{n}</b>
                <span>{BRISTOL_INFO[n].desc}</span>
                <small>{BRISTOL_INFO[n].group}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <h2>{isStool ? 'Tags' : 'Select'}</h2>
      <Chips
        options={presets.map((p) => p.label)}
        selected={picked}
        onToggle={(l) => setPicked((p) => (single ? [l] : toggle(p, l)))}
      />
      <div className="chips">
        <input placeholder="Other" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ flex: 1 }} />
        <button className="btn ghost" disabled={!custom.trim()} onClick={addCustom}>Add</button>
      </div>
      {type === 'symptom' && (
        <>
          <h2>Severity</h2>
          <Chips options={SEVERITY} selected={[severity]} onToggle={setSeverity} />
        </>
      )}
      <TimeField label={isStool ? 'Time' : 'Started'} value={at} onChange={setAt} quick={[15]} />
      {!isStool && (
        <>
          <h2>Duration</h2>
          <Chips options={END_MODES} selected={[endMode]} onToggle={chooseEnd} render={(m) => END_LABEL[m]} />
          {endMode === 'at' && <TimeField label="Ended" value={endAt} onChange={setEndAt} />}
          {badEnd && <p className="empty">End time must be after the start time.</p>}
        </>
      )}
      <button className="btn" disabled={badEnd || (isStool ? !bristol : picked.length === 0)} onClick={save}>
        {editing ? 'Save changes' : 'Save'}
      </button>
    </>
  );
}
