import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { endEntry, entriesBetween } from '../../db/repo';
import { COLUMN_COLOR, COLUMN_LABEL, COLUMN_OF, type Column } from '../../domain/columns';
import type { Entry, Item } from '../../domain/types';
import { HOUR, dayRange, startOfDay } from '../../lib/time';
import { ingredientText } from '../../domain/describe';
import { useSwipe } from '../../ui/useSwipe';
import DatePicker from './DatePicker';
import { labelOf } from './label';
import { layoutColumn } from './layout';

const EMPTY = { items: new Map<number, Item>(), names: new Map<number, string>() };
const HH = 56; // px per hour
const COLS: Column[] = ['intake', 'activity', 'health'];
const WAKING_START = 6.5; // hours; initial scroll position
const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const shiftDay = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

export default function Timeline() {
  const [params, setParams] = useSearchParams();
  const day = Number(params.get('d')) || startOfDay();
  const view = params.get('v') === 'list' ? 'list' : 'day';
  const update = (patch: Record<string, string>) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      Object.entries(patch).forEach(([k, v]) => n.set(k, v));
      return n;
    }, { replace: true });
  const setDay = (t: number) => update({ d: String(t) });
  const setView = (v: 'day' | 'list') => update({ v });
  const [from, to] = dayRange(day);
  const scroller = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState(false);
  const today = startOfDay();
  const prev = () => setDay(shiftDay(day, -1));
  const next = () => { if (day < today) setDay(shiftDay(day, 1)); };
  const swipe = useSwipe(next, prev);

  const entries = useLiveQuery(() => entriesBetween(from, to), [from, to], [] as Entry[]);
  const lookup = useLiveQuery(
    async () => {
      const ids = [...new Set(entries.flatMap((e) => (e.itemId !== undefined ? [e.itemId] : [])))];
      const direct = (await db.items.bulkGet(ids)).flatMap((i) => (i ? [i] : []));
      const comps = [...entries.flatMap((e) => e.components ?? []), ...direct.flatMap((i) => i.components)];
      const childIds = [...new Set(comps.flatMap((c) => (c.itemId !== undefined ? [c.itemId] : [])))];
      const children = (await db.items.bulkGet(childIds)).flatMap((i) => (i ? [i] : []));
      const items = new Map([...direct, ...children].map((i) => [i.id!, i] as const));
      const ingIds = [...new Set(comps.flatMap((c) => (c.ingredientId !== undefined ? [c.ingredientId] : [])))];
      const names = new Map((await db.ingredients.bulkGet(ingIds)).flatMap((g) => (g ? [[g.id!, g.name] as const] : [])));
      return { items, names };
    },
    [entries],
    EMPTY,
  );
  const { items, names } = lookup;

  useEffect(() => {
    if (view === 'day' && scroller.current) scroller.current.scrollTop = WAKING_START * HH;
  }, [view, day]);

  const now = Date.now();
  const y = (t: number) => ((t - from) / HOUR) * HH;

  return (
    <main className="screen">
      <div className="tl-head">
        <Link to="/" className="back" aria-label="Home">‹</Link>
        <button className="chip arrow" aria-label="Previous day" onClick={prev}>←</button>
        <button className="chip" aria-label="Pick a date" onClick={() => setPicking(true)}>
          {new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </button>
        <button className="chip arrow" aria-label="Next day" disabled={day >= today} onClick={next}>→</button>
        <div className="seg" role="group">
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        </div>
      </div>

      <div className="swipe" {...swipe}>
      {view === 'day' ? (
        <div className="scroll" ref={scroller}>
          <div className="cols">
            <span />
            {COLS.map((c) => <span key={c}>{COLUMN_LABEL[c]}</span>)}
          </div>
          <div className="grid" style={{ '--hh': `${HH}px`, height: 24 * HH } as CSSProperties}>
            <div className="hours">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} style={{ top: h * HH + (h === 0 ? 8 : 0) }}>
                  {new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' })}
                </span>
              ))}
            </div>
            {COLS.map((c) => {
              const rows = entries
                .filter((e) => COLUMN_OF[e.type] === c)
                .map((e) => ({ item: e, start: Math.max(e.start, from), end: Math.min(e.ongoing ? now : (e.end ?? e.start), to) }));
              const { blocks, overflow } = layoutColumn(rows, HOUR / 2);
              return (
                <div key={c} className="col">
                  {blocks.map((b) => (
                    <Link
                      key={b.item.id}
                      to={`/edit/${b.item.id}`}
                      className="blk"
                      style={{
                        top: y(b.start),
                        height: y(b.end) - y(b.start),
                        left: `${(b.lane / b.lanes) * 100}%`,
                        width: `${100 / b.lanes}%`,
                        background: COLUMN_COLOR[c],
                      }}
                    >
                      {labelOf(b.item, items)}
                    </Link>
                  ))}
                  {overflow.map((o) => (
                    <button key={o.at} className="more" style={{ top: y(o.at) }} onClick={() => setView('list')}>
                      +{o.count}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <p className="empty">Nothing logged for this day.</p>
      ) : (
        <ul className="list">
          {entries.map((e) => (
            <li key={e.id} className="li" style={{ '--c': COLUMN_COLOR[COLUMN_OF[e.type]] } as CSSProperties}>
              <time>{fmt(e.start)}</time>
              <Link className="grow row-link" to={`/edit/${e.id}`}>
                <span>{labelOf(e, items)}{e.ongoing && ', ongoing'}</span>
                {ingredientText(e, items, names) && <small className="sub">{ingredientText(e, items, names)}</small>}
              </Link>
              {e.ongoing && <button className="chip" onClick={() => endEntry(e.id!)}>End</button>}
            </li>
          ))}
        </ul>
      )}
      </div>
      {picking && <DatePicker value={day} onPick={(d) => { setDay(d); setPicking(false); }} onClose={() => setPicking(false)} />}
    </main>
  );
}
