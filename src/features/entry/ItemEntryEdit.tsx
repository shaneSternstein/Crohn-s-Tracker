import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { linesFromComponents, recentItems, updateEntry, updateFoodEntry } from '../../db/repo';
import type { Entry, IngredientLine, Item } from '../../domain/types';
import { Chips, ErrorText } from '../../ui/bits';
import { TimeField } from '../../ui/TimeField';
import { useSaving } from '../../ui/useSaving';
import IngredientList from './IngredientList';

const fits = (type: Entry['type'], i: Item) =>
  type === 'medication' ? i.kind === 'medication' : type === 'drink' ? i.kind === 'drink' : i.kind === 'food' || i.kind === 'recipe';

/** Loads the entry's own ingredient copy (falling back to its item) before showing the form. */
export default function ItemEntryEdit({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const initial = useLiveQuery(async () => {
    const comps = entry.components ?? (entry.itemId !== undefined ? (await db.items.get(entry.itemId))?.components : undefined) ?? [];
    return linesFromComponents(comps);
  }, [entry.id]);
  if (!initial) return <p className="empty">Loading…</p>;
  return <Form entry={entry} initial={initial} onDone={onDone} />;
}

function Form({ entry, initial, onDone }: { entry: Entry; initial: IngredientLine[]; onDone: () => void }) {
  const isMed = entry.type === 'medication';
  const { busy, error, run } = useSaving();
  const [at, setAt] = useState<number | null>(entry.start);
  const [itemId, setItemId] = useState(entry.itemId);
  const [dose, setDose] = useState(entry.dose ?? '');
  const [lines, setLines] = useState(initial);
  const items = useLiveQuery(async () => (await recentItems(undefined, 200)).filter((i) => fits(entry.type, i)), [entry.type], [] as Item[]);

  const pick = async (id: number) => {
    setItemId(id);
    const it = items.find((i) => i.id === id);
    if (isMed) setDose(it?.dose ?? '');
    else if (it) setLines(await linesFromComponents(it.components));
  };
  const save = async () => {
    const start = at ?? Date.now();
    if (isMed) await updateEntry(entry.id!, { start, itemId, dose: dose.trim() || undefined });
    else await updateFoodEntry(entry.id!, { start, itemId: itemId!, lines });
    onDone();
  };

  return (
    <>
      <TimeField label="Time" value={at} onChange={setAt} quick={[15]} />
      <h2>Item</h2>
      <Chips options={items.map((i) => i.id!)} selected={itemId !== undefined ? [itemId] : []} onToggle={pick} render={(id) => items.find((i) => i.id === id)!.name} />
      {itemId !== undefined && <Link className="btn ghost" to={`/item/${itemId}`}>Edit item</Link>}
      {isMed ? (
        <>
          <h2>Dose for this entry</h2>
          <input placeholder="e.g. 200 mg" value={dose} onChange={(e) => setDose(e.target.value)} />
        </>
      ) : (
        <>
          <p className="empty">Ingredient changes here apply to this entry only.</p>
          <IngredientList lines={lines} onChange={setLines} saved={items.filter((i) => i.id !== itemId)} />
        </>
      )}
      <button className="btn" disabled={itemId === undefined || busy} onClick={() => run(save)}>{busy ? 'Saving…' : 'Save changes'}</button>
      <ErrorText message={error} />
    </>
  );
}
