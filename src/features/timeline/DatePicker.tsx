import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { startOfDay } from '../../lib/time';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NONE = new Set<number>();

/** Month calendar in a bottom sheet. Days with entries get a dot; future days are disabled. */
export default function DatePicker({ value, onPick, onClose }: { value: number; onPick: (day: number) => void; onClose: () => void }) {
  const today = startOfDay();
  const [cursor, setCursor] = useState(() => {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const from = cursor.getTime();
  const to = new Date(y, m + 1, 1).getTime();
  const marked = useLiveQuery(
    async () => new Set((await db.entries.where('start').between(from, to).toArray()).map((e) => startOfDay(e.start))),
    [from, to],
    NONE,
  );
  const shift = (n: number) => setCursor(new Date(y, m + n, 1));

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Pick a date" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="chip" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
          <strong>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button className="chip" aria-label="Next month" disabled={to > today} onClick={() => shift(1)}>›</button>
        </div>
        <div className="cal">
          {WEEKDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
          {Array.from({ length: cursor.getDay() }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
            const t = new Date(y, m, i + 1).getTime();
            return (
              <button
                key={t}
                className="cal-day"
                aria-pressed={t === value}
                data-today={t === today ? 'true' : undefined}
                disabled={t > today}
                onClick={() => onPick(t)}
              >
                {i + 1}
                {marked.has(t) && <i className="dot" />}
              </button>
            );
          })}
        </div>
        <div className="chips">
          <button className="btn ghost" onClick={() => onPick(today)}>Today</button>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
