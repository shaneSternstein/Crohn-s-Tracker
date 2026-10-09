import { useState } from 'react';
import type { IngredientLine, Item } from '../../domain/types';
import { amountToNote, parseIngredients } from '../../lib/parseIngredients';

interface Props {
  lines: IngredientLine[];
  onChange: (lines: IngredientLine[]) => void;
  saved: Item[];
}

/** Single editable list fed by manual entry, pasted text, or saved items (barcode/OCR plug in via onChange). */
export default function IngredientList({ lines, onChange, saved }: Props) {
  const [text, setText] = useState('');
  const set = (i: number, patch: Partial<IngredientLine>) =>
    onChange(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  return (
    <section className="ing">
      <h2>Ingredients</h2>
      <textarea placeholder="Paste ingredients, one per line" value={text} onChange={(e) => setText(e.target.value)} />
      <button
        className="btn ghost"
        disabled={!text.trim()}
        onClick={() => {
          onChange([...lines, ...parseIngredients(text).map(amountToNote)]);
          setText('');
        }}
      >
        Add pasted lines
      </button>
      {lines.map((l, i) => (
        <div className="row" key={i}>
          <input aria-label="Name" value={l.name ?? ''} disabled={l.itemId !== undefined} onChange={(e) => set(i, { name: e.target.value })} />
          <button className="chip" aria-label="Remove" onClick={() => onChange(lines.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
      <button className="btn ghost" onClick={() => onChange([...lines, { name: '' }])}>Add ingredient</button>
      {saved.length > 0 && (
        <select
          aria-label="Add saved item"
          value=""
          onChange={(e) => {
            const it = saved.find((s) => s.id === Number(e.target.value));
            if (it) onChange([...lines, { itemId: it.id, name: it.name }]);
          }}
        >
          <option value="">Add saved item…</option>
          {saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </section>
  );
}
