import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { deleteEntry, endEntry, entriesBetween } from '../../db/repo';
import { COLUMN_COLOR, COLUMN_LABEL, COLUMN_OF, type Column } from '../../domain/columns';
import type { Entry, Item } from '../../domain/types';
import { HOUR, dayRange, startOfDay } from '../../lib/time';
import { labelOf } from './label';
import { layoutColumn } from './layout';

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
  const [day, setDay] = useState(startOfDay());
  const [view, setView] = useState<'day' | 'list'>('day');
  const [from, to] = dayRange(day);
  const scroller = useRef<HTMLDivElement>(null);

  const entries = useLiveQuery(() => entriesBetween(from, to), [from, to], [] as Entry[]);
  const items = useLiveQuery(
    async () => {
      const ids = [...new Set(entries.flatMap((e) => (e.itemId !== undefined ? [e.itemId] : [])))];
      const rows = await db.items.bulkGet(ids);
      return new Map(rows.flatMap((i) => (i ? [[i.id!, i] as const] : [])));
    },
    [entries],
    new Map<number, Item>(),
  );

  useEffect(() => {
    if (view === 'day' && scroller.current) scroller.current.scrollTop = WAKING_START * HH;
  }, [view, day]);

  const now = Date.now();
  const y = (t: number) => ((t - from) / HOUR) * HH;

  return (
    <main className="screen">
      <div className="tl-head">
        <Link to="/" className="back" aria-label="Home">‹</Link>
        <button className="chip" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>←</button>
        <strong>{new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
        <button className="chip" aria-label="Next day" onClick={() => setDay(shiftDay(day, 1))}>→</button>
        <div className="seg" role="group">
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        </div>
      </div>

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
                    <div
                      key={b.item.id}
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
                    </div>
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
              <span className="grow">{labelOf(e, items)}{e.ongoing && ', ongoing'}</span>
              {e.ongoing && <button className="chip" onClick={() => endEntry(e.id!)}>End</button>}
              <button className="chip" aria-label="Delete" onClick={() => deleteEntry(e.id!)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
