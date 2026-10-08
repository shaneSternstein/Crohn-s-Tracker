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

export default function ManageItems() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Filter>('all');
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState('');
  const names = useIngredientNames();
  const items = useLiveQuery(async () => (await db.items.toArray()).sort((a, b) => a.name.localeCompare(b.name)), [], [] as Item[]);
  const shown = matchItems(items.filter((i) => !!i.archived === hidden && (kind === 'all' || i.kind === kind)), q, names);

  const fail = (e: unknown) => setMsg(e instanceof Error ? e.message : 'Something went wrong.');
  const remove = async (i: Item) => {
    try {
      const u = await itemUsage(i.id!);
      const used = u.entries + u.recipes > 0;
      const text = used
        ? `"${i.name}" is used by ${plural(u.entries, 'past entry', 'past entries')}${u.recipes ? ` and ${plural(u.recipes, 'recipe', 'recipes')}` : ''}. It will be hidden from your saved lists. History keeps its name and ingredients.`
        : `Delete "${i.name}" permanently?`;
      if (!window.confirm(text)) return;
      setMsg((await removeItem(i.id!)) === 'deleted' ? `Deleted "${i.name}".` : `Hid "${i.name}". Find it under Hidden.`);
    } catch (e) {
      fail(e);
    }
  };
  const restore = async (i: Item) => {
    try {
      await restoreItem(i.id!);
      setMsg(`Restored "${i.name}".`);
    } catch (e) {
      fail(e);
    }
  };

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
              <span className="grow row-link">
                <span>{i.name}</span>
                <small className="sub">
                  {i.kind}{i.kind === 'medication' ? (i.dose ? `, ${i.dose}` : '') : `, ${plural(i.components.length, 'ingredient', 'ingredients')}`}
                </small>
              </span>
              <Link className="chip" to={`/item/${i.id}`}>Edit</Link>
              {i.archived ? (
                <button className="chip" onClick={() => restore(i)}>Restore</button>
              ) : (
                <button className="chip" onClick={() => remove(i)}>Delete</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
