import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { dailyStats, quartileCutoffs, shadeOf, type DayStats } from '../../analysis/burden';
import type { Entry } from '../../domain/types';
import { daysFrom, startOfDay } from '../../lib/time';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SLIDE_MS = 250;
const num = (v: number) => String(Math.round(v * 10) / 10);
const dayLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const monthStartOf = (y: number, m: number) => new Date(y, m, 1).getTime();

interface Gesture { id: number; x0: number; y0: number; lastX: number; lastT: number; v: number; mode: 'none' | 'h' | 'v' }
type Cuts = readonly [number, number, number];

function Month({ start, today, byDay, cuts }: { start: number; today: number; byDay: Map<number, DayStats>; cuts: Cuts }) {
  const nav = useNavigate();
  const d = new Date(start);
  const y = d.getFullYear();
  const m = d.getMonth();
  return (
    <div className="cal">
      {WEEKDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
      {Array.from({ length: d.getDay() }, (_, i) => <span key={`b${i}`} />)}
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
  );
}

/** Month calendar colored by daily burden. Drag or swipe to change month; tap a day to open it in the timeline. */
export default function Heatmap() {
  const today = startOfDay();
  const entries = useLiveQuery(() => db.entries.toArray(), [], [] as Entry[]);
  const t0 = new Date(today);
  const thisMonth = monthStartOf(t0.getFullYear(), t0.getMonth());
  const [monthStart, setMonthStart] = useState(thisMonth);
  const [shift, setShift] = useState({ x: 0, anim: false }); // strip offset in px from the centered month
  const vp = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const duration = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SLIDE_MS;

  // Shades use all history, so a color means the same thing in every month.
  const { byDay, cuts } = useMemo(() => {
    const first = entries.reduce((m, e) => Math.min(m, e.start), today);
    const stats = dailyStats(entries, daysFrom(first, today));
    return {
      byDay: new Map(stats.map((s) => [s.day, s] as const)),
      cuts: quartileCutoffs(stats.map((s) => s.total)),
    };
  }, [entries, today]);

  const cur = new Date(monthStart);
  const y = cur.getFullYear();
  const m = cur.getMonth();
  const isCurrent = monthStart >= thisMonth;

  // The strip re-centers on the new month before it is painted, so the slide ends without a jump.
  useLayoutEffect(() => {
    setShift({ x: 0, anim: false });
    busy.current = false;
  }, [monthStart]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** step 1 = next month (strip moves left), -1 = previous month. */
  const slide = (step: 1 | -1, target?: number) => {
    if (busy.current || (step === 1 && isCurrent)) return;
    busy.current = true;
    const w = vp.current?.clientWidth ?? 0;
    setShift({ x: step === 1 ? -w : w, anim: true });
    timer.current = window.setTimeout(() => setMonthStart(target ?? monthStartOf(y, m + step)), duration);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    gesture.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: e.timeStamp, v: 0, mode: 'none' };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = gesture.current;
    if (!s || s.id !== e.pointerId || s.mode === 'v') return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (s.mode === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) { s.mode = 'v'; return; } // vertical scroll: leave it alone
      s.mode = 'h';
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.v = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    setShift({ x: dx > 0 || !isCurrent ? dx : dx * 0.3, anim: false }); // resistance when there is no next month
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const s = gesture.current;
    gesture.current = null;
    if (!s || s.mode !== 'h') return;
    const w = vp.current?.clientWidth ?? 1;
    const dx = e.clientX - s.x0;
    if (!cancelled) {
      if (dx < 0 && !isCurrent && (-dx > w * 0.25 || s.v < -0.5)) return slide(1);
      if (dx > 0 && (dx > w * 0.25 || s.v > 0.5)) return slide(-1);
    }
    setShift({ x: 0, anim: true }); // spring back
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
        <strong className="hm-title">{cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        {!isCurrent && <button className="chip" onClick={() => slide(1, thisMonth)}>Today</button>}
      </div>
      <div
        className="hm-viewport"
        ref={vp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerEnd(e, false)}
        onPointerCancel={(e) => onPointerEnd(e, true)}
      >
        <div
          className="hm-strip"
          style={{
            transform: `translate3d(calc(-100% / 3 + ${shift.x}px), 0, 0)`,
            transition: shift.anim ? `transform ${duration}ms cubic-bezier(.2, .8, .2, 1)` : 'none',
          }}
        >
          {[-1, 0, 1].map((n) => {
            const s = monthStartOf(y, m + n);
            return (
              <div key={s} className="hm-pane">
                <Month start={s} today={today} byDay={byDay} cuts={cuts} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="hm-legend">
        {legend.map((l) => (
          <span key={l.shade}><i className="hm-sw" data-shade={l.shade} />{l.text}</span>
        ))}
      </div>
      <p className="sub">
        Swipe to change month. Shades are quartiles of all your days with burden, never below the default scale of 5, 10, and 20. A dashed outline means no food or drink was logged that day, so it is not used in correlation analysis. Blank days have no entries.
      </p>
    </>
  );
}
