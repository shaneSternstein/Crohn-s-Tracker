import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { addPreset, countPresetUses, deletePreset, movePreset, presetsOf, renamePreset } from '../../db/repo';
import type { Preset } from '../../domain/types';
import { Chips, Screen } from '../../ui/bits';

const TYPES: Preset['type'][] = ['symptom', 'activity', 'stool'];
const TITLE: Record<Preset['type'], string> = { symptom: 'Symptoms', activity: 'Activities', stool: 'Stool tags' };
const friendly = (e: unknown) =>
  e instanceof Error && e.name === 'ConstraintError' ? 'A chip with that name already exists.' : e instanceof Error ? e.message : 'Something went wrong.';

export default function ManageChips() {
  const nav = useNavigate();
  const [type, setType] = useState<Preset['type']>('symptom');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState('');
  const rows = useLiveQuery(() => presetsOf(type), [type], [] as Preset[]);

  const guard = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMsg('');
    } catch (e) {
      setMsg(friendly(e));
    }
  };
  const rename = (p: Preset) =>
    guard(async () => {
      const next = window.prompt('Rename chip', p.label)?.trim();
      if (!next || next === p.label) return;
      const uses = await countPresetUses(p);
      const also = uses > 0 && window.confirm(`Also rename it in ${uses} past ${uses === 1 ? 'entry' : 'entries'}? Cancel keeps past entries unchanged.`);
      await renamePreset(p.id!, next, also);
    });
  const remove = (p: Preset) =>
    guard(async () => {
      if (window.confirm(`Delete "${p.label}"? Past entries keep it.`)) await deletePreset(p.id!);
    });
  const add = () =>
    guard(async () => {
      if (!label.trim()) return;
      await addPreset(type, label);
      setLabel('');
    });

  return (
    <Screen title="Chips" onBack={() => nav(-1)}>
      <Chips options={TYPES} selected={[type]} onToggle={setType} render={(t) => TITLE[t]} />
      <div className="chips">
        <input placeholder="New chip" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1 }} />
        <button className="btn ghost" disabled={!label.trim()} onClick={add}>Add</button>
      </div>
      {msg && <p role="alert" className="error">{msg}</p>}
      <ul className="list">
        {rows.map((p, i) => (
          <li key={p.id} className="li" style={{ '--c': 'var(--surface-2)' } as CSSProperties}>
            <span className="grow">{p.label}</span>
            <button className="chip" aria-label="Move up" disabled={i === 0} onClick={() => guard(() => movePreset(p.id!, -1))}>↑</button>
            <button className="chip" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => guard(() => movePreset(p.id!, 1))}>↓</button>
            <button className="chip" onClick={() => rename(p)}>Rename</button>
            <button className="chip" onClick={() => remove(p)}>Delete</button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
