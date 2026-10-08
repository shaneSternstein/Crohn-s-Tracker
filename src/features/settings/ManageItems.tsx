import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useIngredientNames } from '../../db/hooks';
import { itemUsage, removeItem, restoreItem } from '../../db/repo';
import type { Item } from '../../domain/types';
import { matchItems } from '../../lib/search';
import { Chips, Screen } from '../../ui/bits';

const KINDS = ['all', 'food', 'drink', 'recipe', 'medication'] as const;
type Filter = (typeof KINDS)[number];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const NO_USE = { entries: 0, recipes: 0 };

export default function ManageItems() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Filter>('all');
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const names = useIngredientNames();
  const items = useLiveQuery(async () => (await db.items.toArray()).sort((a, b) => a.name.localeCompare(b.name)), [], [] as Item[]);
  const shown = matchItems(items.filter((i) => !!i.archived === hidden && (kind === 'all' || i.kind === kind)), q, names);

  return (
    <Screen title="Saved items" onBack={() => nav(-1)}>
      <input placeholder="Search by name or ingredient" value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips options={KINDS} selected={[kind]} onToggle={setKind} />
      <div className="chips">
        <button className="chip" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>Hidden items</button>
      </div>
      {msg && <p role="status">{msg}</p>}
      {shown.length === 0 ? (
        <p className="empty">{hidden ? 'No hidden items.' : 'No saved items.'}</p>
      ) : (
        <ul className="list">
          {shown.map((i) => (
            <li key={i.id} className="li" style={{ '--c': 'var(--surface-2)' } as CSSProperties}>
              <button type="button" className="row-btn" onClick={() => { setMsg(''); setSelected(i); }}>
                <span>{i.name}</span>
                <small className="sub">
                  {i.kind}{i.kind === 'medication' ? (i.dose ? `, ${i.dose}` : '') : `, ${plural(i.components.length, 'ingredient', 'ingredients')}`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <ItemSheet key={selected.id} item={selected} onClose={() => setSelected(null)} onDone={setMsg} />}
    </Screen>
  );
}

function ItemSheet({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: (msg: string) => void }) {
  const [err, setErr] = useState('');
  const use = useLiveQuery(() => itemUsage(item.id!), [item.id], NO_USE);
  const used = use.entries + use.recipes > 0;

  const act = async (fn: () => Promise<string>) => {
    try {
      onDone(await fn());
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };
  const remove = () => {
    if (!used && !window.confirm(`Delete "${item.name}" permanently?`)) return;
    void act(async () => ((await removeItem(item.id!)) === 'deleted' ? `Deleted "${item.name}".` : `Hid "${item.name}". Find it under Hidden items.`));
  };
  const restore = () => act(async () => { await restoreItem(item.id!); return `Restored "${item.name}".`; });

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{item.name}</strong>
          <button className="chip" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <p className="empty">
          {used
            ? `Used by ${plural(use.entries, 'past entry', 'past entries')}${use.recipes ? ` and ${plural(use.recipes, 'recipe', 'recipes')}` : ''}. Removing it hides it from your saved lists, and history keeps its name and ingredients.`
            : 'Not used by any entries or recipes.'}
        </p>
        {err && <p role="alert" className="error">{err}</p>}
        <Link className="btn" to={`/item/${item.id}`}>Edit item</Link>
        {item.archived ? (
          <button className="btn ghost" onClick={restore}>Restore</button>
        ) : (
          <button className="btn ghost" onClick={remove}>{used ? 'Hide from saved lists' : 'Delete permanently'}</button>
        )}
      </div>
    </div>
  );
}
