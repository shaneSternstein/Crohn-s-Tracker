import { memo, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { endEntry, entriesBetween } from '../../db/repo';
import { COLUMN_COLOR, COLUMN_LABEL, COLUMN_OF, type Column } from '../../domain/columns';
import { ingredientText } from '../../domain/describe';
import type { Entry, Item } from '../../domain/types';
import { HOUR, dayRange } from '../../lib/time';
import { labelOf } from './label';
import { layoutColumn } from './layout';

export const HH = 56; // px per hour
export const WAKING_START = 6.5; // hours; initial scroll position
const COLS: Column[] = ['intake', 'activity', 'health'];
const NO_ENTRIES: Entry[] = [];
const EMPTY = { items: new Map<number, Item>(), names: new Map<number, string>() };
const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** One day of the timeline, as a day grid or a list. Loads its own entries so neighbors are ready to slide in. */
function DayPanel({ day, view }: { day: number; view: 'day' | 'list' }) {
  const [, setParams] = useSearchParams();
  const showList = () =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('v', 'list');
      return n;
    }, { replace: true });

  const [from, to] = dayRange(day);
  const entries = useLiveQuery(() => entriesBetween(from, to), [from, to], NO_ENTRIES);
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
  const now = Date.now();
  const y = (t: number) => ((t - from) / HOUR) * HH;

  if (view === 'list') {
    return (
      <div className="panel">
        {entries.length === 0 ? (
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
    );
  }

  return (
    <div className="panel">
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
                <button key={o.at} className="more" style={{ top: y(o.at) }} onClick={showList}>
                  +{o.count}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(DayPanel);
