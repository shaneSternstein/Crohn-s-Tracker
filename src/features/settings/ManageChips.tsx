import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { addPreset, countPresetUses, deletePreset, presetsOf, renamePreset, reorderPresets } from '../../db/repo';
import type { Preset } from '../../domain/types';
import { Chips, Screen } from '../../ui/bits';

const TYPES: Preset['type'][] = ['symptom', 'activity', 'stool'];
const TITLE: Record<Preset['type'], string> = { symptom: 'Symptoms', activity: 'Activities', stool: 'Stool tags' };
const friendly = (e: unknown) =>
  e instanceof Error && e.name === 'ConstraintError' ? 'A chip with that name already exists.' : e instanceof Error ? e.message : 'Something went wrong.';

interface Drag { id: number; from: number; to: number; dy: number }

export default function ManageChips() {
  const nav = useNavigate();
  const [type, setType] = useState<Preset['type']>('symptom');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Preset | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [localOrder, setLocalOrder] = useState<number[] | null>(null); // holds the new order until the database catches up
  const rows = useLiveQuery(() => presetsOf(type), [type], [] as Preset[]);
  const rowEls = useRef<(HTMLLIElement | null)[]>([]);
  const start = useRef({ y: 0, centers: [] as number[], step: 0 });

  const shown = localOrder ? [...rows].sort((a, b) => localOrder.indexOf(a.id!) - localOrder.indexOf(b.id!)) : rows;
  useEffect(() => {
    if (localOrder && (localOrder.length !== rows.length || rows.map((r) => r.id).join() === localOrder.join())) setLocalOrder(null);
  }, [rows, localOrder]);

  const guard = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMsg('');
    } catch (e) {
      setMsg(friendly(e));
    }
  };
  const commit = (ids: number[]) => {
    setLocalOrder(ids);
    void guard(() => reorderPresets(ids));
  };
  const add = () =>
    guard(async () => {
      if (!label.trim()) return;
      await addPreset(type, label);
      setLabel('');
    });

  const down = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    const rects = shown.map((_, k) => rowEls.current[k]!.getBoundingClientRect());
    const centers = rects.map((r) => r.top + window.scrollY + r.height / 2);
    start.current = { y: e.pageY, centers, step: centers.length > 1 ? centers[1] - centers[0] : rects[0].height };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: shown[i].id!, from: i, to: i, dy: 0 });
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dy = e.pageY - start.current.y;
    const center = start.current.centers[drag.from] + dy;
    let to = 0;
    start.current.centers.forEach((c, k) => { if (k !== drag.from && c < center) to++; });
    setDrag({ ...drag, to, dy });
    if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
    else if (e.clientY < 70) window.scrollBy(0, -12);
  };
  const up = () => {
    if (drag && drag.to !== drag.from) {
      const ids = shown.map((r) => r.id!);
      const [moved] = ids.splice(drag.from, 1);
      ids.splice(drag.to, 0, moved);
      commit(ids);
    }
    setDrag(null);
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const j = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : i;
    if (j === i || j < 0 || j >= shown.length) return;
    e.preventDefault();
    const ids = shown.map((r) => r.id!);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    commit(ids);
  };

  /** Pixel offset of row i while another row is being dragged. */
  const offset = (i: number) => {
    if (!drag) return 0;
    if (i === drag.from) return drag.dy;
    const j = i > drag.from ? i - 1 : i;
    return ((j >= drag.to ? j + 1 : j) - i) * start.current.step;
  };

  return (
    <Screen title="Chips" onBack={() => nav(-1)}>
      <Chips options={TYPES} selected={[type]} onToggle={setType} render={(t) => TITLE[t]} />
      <div className="chips">
        <input placeholder="New chip" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1 }} />
        <button className="btn ghost" disabled={!label.trim()} onClick={add}>Add</button>
      </div>
      {msg && <p role="alert" className="error">{msg}</p>}
      <ul className="list">
        {shown.map((p, i) => (
          <li
            key={p.id}
            ref={(el) => { rowEls.current[i] = el; }}
            className={`li${drag ? (drag.id === p.id ? ' dragging' : ' shifting') : ''}`}
            style={{ '--c': 'var(--surface-2)', transform: `translateY(${offset(i)}px)` } as CSSProperties}
          >
            <button
              type="button"
              className="drag"
              aria-label={`Reorder ${p.label}`}
              onPointerDown={(e) => down(e, i)}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => key(e, i)}
            >
              ⋮⋮
            </button>
            <button type="button" className="row-btn" onClick={() => setSelected(p)}>{p.label}</button>
          </li>
        ))}
      </ul>
      {selected && <ChipSheet key={selected.id} chip={selected} onClose={() => setSelected(null)} />}
    </Screen>
  );
}

function ChipSheet({ chip, onClose }: { chip: Preset; onClose: () => void }) {
  const [name, setName] = useState(chip.label);
  const [also, setAlso] = useState(true);
  const [err, setErr] = useState('');
  const uses = useLiveQuery(() => countPresetUses(chip), [chip.id, chip.label], 0);

  const save = async () => {
    try {
      await renamePreset(chip.id!, name, also && uses > 0);
      onClose();
    } catch (e) {
      setErr(friendly(e));
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${chip.label}"? Past entries keep it.`)) return;
    try {
      await deletePreset(chip.id!);
      onClose();
    } catch (e) {
      setErr(friendly(e));
    }
  };

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Edit ${chip.label}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>Edit chip</strong>
          <button className="chip" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        {uses > 0 && (
          <label className="check">
            <input type="checkbox" checked={also} onChange={(e) => setAlso(e.target.checked)} />
            Also rename in {uses} past {uses === 1 ? 'entry' : 'entries'}
          </label>
        )}
        {err && <p role="alert" className="error">{err}</p>}
        <button className="btn" disabled={!name.trim() || name.trim() === chip.label} onClick={save}>Save name</button>
        <button className="btn ghost" onClick={remove}>Delete chip</button>
      </div>
    </div>
  );
}
