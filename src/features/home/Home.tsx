import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { addWater, hydrationTotal, undoLastWater } from '../../db/repo';
import { dayRange } from '../../lib/time';

const TILES = [
  { to: '/add/food', label: 'Food', color: 'var(--food)' },
  { to: '/add/drink', label: 'Drink', color: 'var(--food)' },
  { to: '/add/medication', label: 'Medication', color: 'var(--food)' },
  { to: '/add/symptom', label: 'Symptom', color: 'var(--symptom)' },
  { to: '/add/stool', label: 'Stool', color: 'var(--symptom)' },
  { to: '/add/activity', label: 'Activity', color: 'var(--activity)' },
  { to: '/add/sleep', label: 'Sleep', color: 'var(--surface-2)' },
];
const tint = (c: string) => ({ '--tile': c }) as CSSProperties;

export default function Home() {
  const ml = useLiveQuery(() => hydrationTotal(...dayRange()), [], 0);
  return (
    <main className="screen">
      <header><h1>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h1></header>
      <div className="tiles">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className={t.color === 'var(--surface-2)' ? 'tile alt' : 'tile'} style={tint(t.color)}>
            {t.label}
          </Link>
        ))}
        <button className="tile alt" style={tint('var(--surface-2)')} onClick={() => addWater()}>
          Water <small>{ml} ml today (+250)</small>
        </button>
      </div>
      <div className="chips">
        <Link to="/timeline" className="btn">Timeline</Link>
        <button className="btn ghost" onClick={() => undoLastWater()}>Undo water</button>
      </div>
    </main>
  );
}
