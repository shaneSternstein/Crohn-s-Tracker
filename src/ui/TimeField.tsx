import { useState, type PointerEvent } from 'react';
import { MIN, startOfDay } from '../lib/time';

const C = 120;
const R = 86;
const pt = (deg: number, r = R) => ({
  x: C + r * Math.sin((deg * Math.PI) / 180),
  y: C - r * Math.cos((deg * Math.PI) / 180),
});
const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = (t: number) => {
  const diff = Math.round((startOfDay() - startOfDay(t)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface Props {
  label: string;
  /** Epoch ms, or null meaning "now" (resolved by the caller at save time). */
  value: number | null;
  onChange: (v: number | null) => void;
  /** Extra quick chips, in minutes ago. */
  quick?: number[];
}

export function TimeField({ label, value, onChange, quick = [] }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <h2>{label}</h2>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={value === null} onClick={() => onChange(null)}>Now</button>
        {quick.map((m) => (
          <button key={m} type="button" className="chip" onClick={() => onChange(Date.now() - m * MIN)}>{m}m ago</button>
        ))}
        <button type="button" className="chip" aria-pressed={value !== null} aria-expanded={open} onClick={() => setOpen(!open)}>
          {value === null ? 'Set time' : `${dayLabel(value)} ${fmtTime(value)}`}
        </button>
      </div>
      {open && <Dial value={value ?? Date.now()} onChange={onChange} onDone={() => setOpen(false)} />}
    </>
  );
}

function Dial({ value, onChange, onDone }: { value: number; onChange: (v: number) => void; onDone: () => void }) {
  const [mode, setMode] = useState<'h' | 'm'>('h');
  const d = new Date(value);
  const pm = d.getHours() >= 12;
  const h12 = d.getHours() % 12 || 12;
  const min = d.getMinutes();
  const isYesterday = startOfDay(value) < startOfDay();

  const edit = (fn: (n: Date) => void) => {
    const n = new Date(value);
    fn(n);
    onChange(n.getTime());
  };
  const setHour = (h: number) => edit((n) => n.setHours((h % 12) + (pm ? 12 : 0)));
  const setMin = (m: number) => edit((n) => n.setMinutes(m, 0, 0));
  const setPm = (p: boolean) => edit((n) => n.setHours((n.getHours() % 12) + (p ? 12 : 0)));
  const setYesterday = (y: boolean) =>
    edit((n) => {
      const t = new Date();
      if (y) t.setDate(t.getDate() - 1);
      n.setFullYear(t.getFullYear(), t.getMonth(), t.getDate());
    });

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (mode === 'h') setHour(Math.round(deg / 30));
    else setMin(Math.round(deg / 6) % 60);
  };

  const handDeg = mode === 'h' ? (h12 % 12) * 30 : min * 6;
  const end = pt(handDeg);
  const labels = mode === 'h' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="dial-wrap">
      <div className="digital">
        <button type="button" aria-pressed={mode === 'h'} onClick={() => setMode('h')}>{h12}</button>:
        <button type="button" aria-pressed={mode === 'm'} onClick={() => setMode('m')}>{String(min).padStart(2, '0')}</button>
        <div className="stack">
          <button type="button" aria-pressed={!pm} onClick={() => setPm(false)}>AM</button>
          <button type="button" aria-pressed={pm} onClick={() => setPm(true)}>PM</button>
        </div>
      </div>
      <svg
        className="dial"
        viewBox="0 0 240 240"
        role="img"
        aria-label={mode === 'h' ? 'Hour dial' : 'Minute dial'}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (e.buttons) pick(e); }}
        onPointerUp={() => { if (mode === 'h') setMode('m'); }}
      >
        <circle className="face" cx={C} cy={C} r={112} />
        {labels.map((n) => {
          const p = pt(mode === 'h' ? n * 30 : n * 6);
          return <text key={n} x={p.x} y={p.y}>{n}</text>;
        })}
        <line className="hand" x1={C} y1={C} x2={end.x} y2={end.y} />
        <circle className="hand-dot" cx={C} cy={C} r={4} />
        <circle className="knob" cx={end.x} cy={end.y} r={18} />
        <text className="knob-text" x={end.x} y={end.y}>{mode === 'h' ? h12 : min}</text>
      </svg>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={!isYesterday} onClick={() => setYesterday(false)}>Today</button>
        <button type="button" className="chip" aria-pressed={isYesterday} onClick={() => setYesterday(true)}>Yesterday</button>
      </div>
      <button type="button" className="btn" onClick={onDone}>Done</button>
    </div>
  );
}
