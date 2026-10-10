import type { CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { setIngredientHidden } from '../../db/repo';
import type { Ingredient } from '../../domain/types';

/** Ingredients hidden from trigger results. Hiding only affects analysis; no entries change. */
export default function HiddenIngredients() {
  const rows = useLiveQuery(() => db.ingredients.filter((i) => !!i.hidden).toArray(), [], [] as Ingredient[]);
  return (
    <section className="section">
      <h2>Hidden ingredients</h2>
      {rows.length === 0 ? (
        <p className="empty">None. Hide an ingredient from its page under Insights, Triggers.</p>
      ) : (
        <ul className="list">
          {rows.map((i) => (
            <li key={i.id} className="li" style={{ '--c': 'var(--surface-2)' } as CSSProperties}>
              <span className="grow">{i.name}</span>
              <button className="chip" onClick={() => void setIngredientHidden(i.id!, false)}>Unhide</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
