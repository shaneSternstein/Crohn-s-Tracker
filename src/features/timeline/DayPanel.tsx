import { memo, useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { endEntry, entriesBetween, sleepOverlapping } from '../../db/repo';
import { COLUMN_COLOR, COLUMN_LABEL, COLUMN_OF, type Column } from '../../domain/columns';
import { ingredientText } from '../../domain/describe';
import type { Entry, Item, SleepLog } from '../../domain/types';
import { HOUR, dayRange, startOfDay } from '../../lib/time';
import { labelOf } from './label';
import { layoutColumn } from './layout';

export const HH = 56; // px per hour
export const WAKING_START = 6.5; // hours; initial scroll position
const COLS: Column[] = ['intake', 'activity', 'health'];
const NO_ENTRIES: Entry[] = [];
const NO_SLEEP: SleepLog[] = [];
const EMPTY = { items: new Map<number, Item>(), names: new Map<number, string>() };
const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const hoursOf = (s: SleepLog) => ((s.end - s.start) / HOUR).toFixed(1);

type Row = { t: number; entry: Entry; sleep?: undefined } | { t: number; sleep: SleepLog; entry?: undefined };

/** One day of the timeline, as a day grid or a list. Loads its own data so neighbors are ready to slide in. */
function DayPanel({ day, view }: { day: number; view: 'day' | 'list' }) {
  const [, setParams] = useSearchParams();
  const showList = () =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('v', 'list');
      return n;
    }, { replace: true });

  const [from, to] = dayRange(day);
  const isToday = day === startOfDay();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => tick((n) => n + 1), 60_000); // keeps the now line current
    return () => window.clearInterval(id);
  }, [isToday]);

  const entries = useLiveQuery(() => entriesBetween(from, to), [from, to], NO_ENTRIES);
  const sleeps = useLiveQuery(() => sleepOverlapping(from, to), [from, to], NO_SLEEP);
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
    const rows: Row[] = [
      ...entries.map((entry): Row => ({ t: entry.start, entry })),
      ...sleeps.map((sleep): Row => ({ t: Math.max(sleep.start, from), sleep })),
    ].sort((a, b) => a.t - b.t);
    return (
      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty">Nothing logged for this day.</p>
        ) : (
          <ul className="list">
            {rows.map((r) =>
              r.sleep ? (
                <li key={`s${r.sleep.id}`} className="li" style={{ '--c': 'var(--muted)' } as CSSProperties}>
                  <time>{fmt(r.t)}</time>
                  <Link className="grow row-link" to={`/sleep/${r.sleep.id}`}>
                    <span>Sleep, {hoursOf(r.sleep)} h</span>
                    <small className="sub">{fmt(r.sleep.start)} to {fmt(r.sleep.end)}</small>
                  </Link>
                </li>
              ) : (
                <li key={r.entry.id} className="li" style={{ '--c': COLUMN_COLOR[COLUMN_OF[r.entry.type]] } as CSSProperties}>
                  <time>{fmt(r.entry.start)}</time>
                  <Link className="grow row-link" to={`/edit/${r.entry.id}`}>
                    <span>{labelOf(r.entry, items)}{r.entry.ongoing && ', ongoing'}</span>
                    {ingredientText(r.entry, items, names) && <small className="sub">{ingredientText(r.entry, items, names)}</small>}
                  </Link>
                  {r.entry.ongoing && <button className="chip" onClick={() => endEntry(r.entry.id!)}>End</button>}
                </li>
              ),
            )}
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
        {sleeps.map((s) => (
          <div key={`b${s.id}`} className="sleep-band" style={{ top: y(Math.max(s.start, from)), height: y(Math.min(s.end, to)) - y(Math.max(s.start, from)) }} />
        ))}
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
        {sleeps.map((s) => (
          <Link key={`t${s.id}`} to={`/sleep/${s.id}`} className="sleep-tag" style={{ top: y(Math.max(s.start, from)) + 4 }}>
            Sleep {hoursOf(s)} h
          </Link>
        ))}
        {isToday && <div className="now-line" style={{ top: y(now) }} />}
      </div>
    </div>
  );
}

export default memo(DayPanel);
