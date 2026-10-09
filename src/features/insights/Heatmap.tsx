import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { dailyStats, quartileCutoffs, shadeOf } from '../../analysis/burden';
import type { Entry } from '../../domain/types';
import { daysFrom, startOfDay } from '../../lib/time';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SWIPE_PX = 50;
const num = (v: number) => String(Math.round(v * 10) / 10);
const dayLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Month calendar colored by daily burden. Swipe to change month; tap a day to open it in the timeline. */
export default function Heatmap() {
  const nav = useNavigate();
  const today = startOfDay();
  const entries = useLiveQuery(() => db.entries.toArray(), [], [] as Entry[]);
  const t0 = new Date(today);
  const thisMonth = new Date(t0.getFullYear(), t0.getMonth(), 1).getTime();
  const [cursor, setCursor] = useState(() => new Date(thisMonth));
  const down = useRef<{ x: number; y: number } | null>(null);

  // Shades use all history, so a color means the same thing in every month.
  const { byDay, cuts } = useMemo(() => {
    const first = entries.reduce((m, e) => Math.min(m, e.start), today);
    const stats = dailyStats(entries, daysFrom(first, today));
    return {
      byDay: new Map(stats.map((s) => [s.day, s] as const)),
      cuts: quartileCutoffs(stats.map((s) => s.total)),
    };
  }, [entries, today]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const isCurrent = cursor.getTime() === thisMonth;
  const shift = (n: number) => {
    const next = new Date(y, m + n, 1);
    if (next.getTime() <= thisMonth) setCursor(next);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    down.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = down.current;
    down.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) shift(dx < 0 ? 1 : -1);
  };

  const legend = [
    { shade: 0, text: '0' },
    { shade: 1, text: `up to ${num(cuts[0])}` },
    { shade: 2, text: `${num(cuts[0])} to ${num(cuts[1])}` },
    { shade: 3, text: `${num(cuts[1])} to ${num(cuts[2])}` },
    { shade: 4, text: `over ${num(cuts[2])}` },
  ];

  return (
    <>
      <div className="hm-head">
        <button className="hm-title" disabled={isCurrent} aria-label="Go to current month" onClick={() => setCursor(new Date(thisMonth))}>
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </button>
        <small className="sub">Swipe to change month</small>
      </div>
      <div className="cal hm" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { down.current = null; }}>
        {WEEKDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
        {Array.from({ length: cursor.getDay() }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
          const t = new Date(y, m, i + 1).getTime();
          const s = byDay.get(t);
          const has = !!s?.hasData;
          return (
            <button
              key={t}
              className="hm-day"
              data-shade={has ? shadeOf(s!.total, cuts) : undefined}
              data-gap={has && !s!.logged ? 'true' : undefined}
              data-today={t === today ? 'true' : undefined}
              disabled={t > today}
              aria-label={`${dayLabel(t)}, ${has ? `burden ${num(s!.total)}` : 'no entries'}`}
              onClick={() => nav(`/timeline?d=${t}`)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="hm-legend">
        {legend.map((l) => (
          <span key={l.shade}><i className="hm-sw" data-shade={l.shade} />{l.text}</span>
        ))}
      </div>
      <p className="sub">
        Shades are quartiles of all your days with burden. A dashed outline means no food or drink was logged that day, so it is not used in correlation analysis. Blank days have no entries.
      </p>
    </>
  );
}
