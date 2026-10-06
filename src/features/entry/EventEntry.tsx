import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { addEntry } from '../../db/repo';
import type { Bristol, Preset, Severity } from '../../domain/types';
import { MIN, presetToTime } from '../../lib/time';
import { Chips, StartPicker } from '../../ui/bits';

type Kind = 'symptom' | 'activity' | 'stool';
const BRISTOL: Bristol[] = [1, 2, 3, 4, 5, 6, 7];
const SEVERITY: Severity[] = [1, 2, 3, 4, 5];
const DURATIONS = [0, 15, 30, 60, 120];
const toggle = <T,>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

/** Symptom, activity, and stool entry. Chips come from presets; one save logs all selected. */
export default function EventEntry({ type }: { type: Kind }) {
  const nav = useNavigate();
  const [mins, setMins] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>(3);
  const [ongoing, setOngoing] = useState(false);
  const [dur, setDur] = useState(0);
  const [bristol, setBristol] = useState<Bristol>();
  const [custom, setCustom] = useState('');
  const presets = useLiveQuery(() => db.presets.where('type').equals(type).toArray(), [type], [] as Preset[]);
  const isStool = type === 'stool';

  const addCustom = async () => {
    const label = custom.trim();
    if (!label) return;
    await db.presets.add({ type, label }).catch(() => undefined); // unique [type+label]
    setPicked((p) => (p.includes(label) ? p : [...p, label]));
    setCustom('');
  };

  const save = async () => {
    const start = presetToTime(mins);
    if (isStool) {
      await addEntry({ type, start, ongoing: false, bristol, tags: picked });
    } else {
      const end = !ongoing && dur ? start + dur * MIN : undefined;
      for (const label of picked) {
        await addEntry({ type, start, ongoing, end, label, severity: type === 'symptom' ? severity : undefined });
      }
    }
    nav('/');
  };

  return (
    <>
      {isStool && (
        <>
          <h2>Bristol type</h2>
          <Chips options={BRISTOL} selected={bristol ? [bristol] : []} onToggle={setBristol} />
        </>
      )}
      <h2>{isStool ? 'Tags' : 'Select'}</h2>
      <Chips options={presets.map((p) => p.label)} selected={picked} onToggle={(l) => setPicked((p) => toggle(p, l))} />
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
      <StartPicker value={mins} onChange={setMins} />
      {!isStool && (
        <>
          <h2>Duration</h2>
          <div className="chips">
            <button className="chip" aria-pressed={ongoing} onClick={() => setOngoing(!ongoing)}>Ongoing</button>
            {!ongoing && (
              <Chips options={DURATIONS} selected={[dur]} onToggle={setDur} render={(d) => (d === 0 ? 'Instant' : d >= 60 ? `${d / 60}h` : `${d}m`)} />
            )}
          </div>
        </>
      )}
      <button className="btn" disabled={isStool ? !bristol : picked.length === 0} onClick={save}>Save</button>
    </>
  );
}
