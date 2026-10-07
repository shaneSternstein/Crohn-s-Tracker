import { useLiveQuery } from 'dexie-react-hooks';
import { ingredientLines } from '../db/repo';

export function ItemIngredients({ itemId }: { itemId?: number }) {
  const lines = useLiveQuery(() => (itemId === undefined ? [] : ingredientLines(itemId)), [itemId], [] as string[]);
  if (!lines.length) return null;
  return (
    <>
      <h2>Ingredients</h2>
      <ul className="ing-view">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </>
  );
}
