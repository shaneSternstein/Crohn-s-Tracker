import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfDay } from '../../lib/time';
import DatePicker from './DatePicker';
import DayPanel, { HH, WAKING_START } from './DayPanel';

const SLIDE_MS = 250;
const shiftDay = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

interface Gesture { id: number; x0: number; y0: number; lastX: number; lastT: number; v: number; mode: 'none' | 'h' | 'v' }

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

  const today = startOfDay();
  const days = [shiftDay(day, -1), day, shiftDay(day, 1)];
  const [picking, setPicking] = useState(false);
  const [shift, setShift] = useState({ x: 0, anim: false }); // strip offset in px from the centered day
  const vp = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const duration = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SLIDE_MS;

  // The strip re-centers on the new day before it is painted, so the slide ends without a jump.
  useLayoutEffect(() => {
    setShift({ x: 0, anim: false });
    busy.current = false;
  }, [day]);
  useEffect(() => {
    if (view === 'day' && scroller.current) scroller.current.scrollTop = WAKING_START * HH;
  }, [view]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** step 1 = next day (strip moves left), -1 = previous day. */
  const slide = (step: 1 | -1) => {
    if (busy.current || (step === 1 && day >= today)) return;
    busy.current = true;
    const w = vp.current?.clientWidth ?? 0;
    setShift({ x: step === 1 ? -w : w, anim: true });
    timer.current = window.setTimeout(() => setDay(shiftDay(day, step)), duration);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || busy.current) return;
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
    setShift({ x: dx > 0 || day < today ? dx : dx * 0.3, anim: false }); // resistance when there is no next day
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const s = gesture.current;
    gesture.current = null;
    if (!s || s.mode !== 'h') return;
    const w = vp.current?.clientWidth ?? 1;
    const dx = e.clientX - s.x0;
    if (!cancelled) {
      if (dx < 0 && day < today && (-dx > w * 0.25 || s.v < -0.5)) return slide(1);
      if (dx > 0 && (dx > w * 0.25 || s.v > 0.5)) return slide(-1);
    }
    setShift({ x: 0, anim: true }); // spring back
  };

  const strip = (
    <div
      className="strip"
      style={{
        transform: `translate3d(calc(-100% / 3 + ${shift.x}px), 0, 0)`,
        transition: shift.anim ? `transform ${duration}ms cubic-bezier(.2, .8, .2, 1)` : 'none',
      }}
    >
      {days.map((d) => <DayPanel key={d} day={d} view={view} />)}
    </div>
  );

  return (
    <main className="screen">
      <div className="tl-head">
        <button className="chip arrow" aria-label="Previous day" onClick={() => slide(-1)}>←</button>
        <button className="chip" aria-label="Pick a date" onClick={() => setPicking(true)}>
          {new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </button>
        <button className="chip arrow" aria-label="Next day" disabled={day >= today} onClick={() => slide(1)}>→</button>
        <div className="seg" role="group">
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        </div>
      </div>

      <div
        className="viewport"
        ref={vp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerEnd(e, false)}
        onPointerCancel={(e) => onPointerEnd(e, true)}
      >
        {view === 'day' ? <div className="scroll" ref={scroller}>{strip}</div> : strip}
      </div>

      {picking && <DatePicker value={day} onPick={(d) => { setDay(d); setPicking(false); }} onClose={() => setPicking(false)} />}
    </main>
  );
}
