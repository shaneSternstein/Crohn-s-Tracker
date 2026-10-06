import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { START_PRESETS } from '../lib/time';

export const Screen = ({ title, children }: { title: string; children: ReactNode }) => (
  <main className="screen">
    <header>
      <Link to="/" className="back" aria-label="Home">‹</Link>
      <h1>{title}</h1>
    </header>
    {children}
  </main>
);

interface ChipsProps<T> {
  options: readonly T[];
  selected: readonly T[];
  onToggle: (v: T) => void;
  render?: (v: T) => string;
}

export function Chips<T extends string | number>({ options, selected, onToggle, render }: ChipsProps<T>) {
  return (
    <div className="chips" role="group">
      {options.map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}>
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

export function StartPicker({ value, onChange }: { value: number; onChange: (minutesAgo: number) => void }) {
  return (
    <>
      <h2>Started</h2>
      <Chips
        options={START_PRESETS.map((p) => p.minutes)}
        selected={[value]}
        onToggle={onChange}
        render={(m) => START_PRESETS.find((p) => p.minutes === m)!.label}
      />
    </>
  );
}
