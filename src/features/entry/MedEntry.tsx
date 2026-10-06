import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { addEntry, recentItems, saveItem } from '../../db/repo';
import type { Item } from '../../domain/types';
import { presetToTime } from '../../lib/time';
import { Chips, StartPicker } from '../../ui/bits';

export default function MedEntry() {
  const nav = useNavigate();
  const [mins, setMins] = useState(0);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const meds = useLiveQuery(() => recentItems('medication', 40), [], [] as Item[]);

  const log = async (itemId: number) => {
    await addEntry({ type: 'medication', start: presetToTime(mins), ongoing: false, itemId });
    nav('/');
  };
  const create = async () =>
    log(await saveItem({ kind: 'medication', name, dose: dose.trim() || undefined, lines: [] }));

  return (
    <>
      <StartPicker value={mins} onChange={setMins} />
      {meds.length > 0 && (
        <>
          <h2>Saved</h2>
          <Chips
            options={meds.map((m) => m.id!)}
            selected={[]}
            onToggle={log}
            render={(id) => {
              const m = meds.find((x) => x.id === id)!;
              return m.dose ? `${m.name} ${m.dose}` : m.name;
            }}
          />
        </>
      )}
      <h2>New</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Default dose (e.g. 200 mg)" value={dose} onChange={(e) => setDose(e.target.value)} />
      <button className="btn" disabled={!name.trim()} onClick={create}>Save and log</button>
    </>
  );
}
