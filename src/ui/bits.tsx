import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const Screen = ({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) => (
  <main className="screen">
    <header>
      {onBack ? (
        <button className="back" aria-label="Back" onClick={onBack}>‹</button>
      ) : (
        <Link to="/" className="back" aria-label="Home">‹</Link>
      )}
      <h1>{title}</h1>
    </header>
    {children}
  </main>
);

export const ErrorText = ({ message }: { message: string }) =>
  message ? <p role="alert" className="error">{message}</p> : null;

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
