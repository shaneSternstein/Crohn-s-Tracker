import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { recentItems, updateEntry } from '../../db/repo';
import type { Entry, Item } from '../../domain/types';
import { Chips, ErrorText } from '../../ui/bits';
import { ItemIngredients } from '../../ui/ItemIngredients';
import { useSaving } from '../../ui/useSaving';
import { TimeField } from '../../ui/TimeField';

const fits = (type: Entry['type'], i: Item) =>
  type === 'medication' ? i.kind === 'medication' : type === 'drink' ? i.kind === 'drink' : i.kind === 'food' || i.kind === 'recipe';

/** Edit a food, drink, or medication entry: time, which item, and (medication) this entry's dose. */
export default function ItemEntryEdit({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const isMed = entry.type === 'medication';
  const { busy, error, run } = useSaving();
  const [at, setAt] = useState<number | null>(entry.start);
  const [itemId, setItemId] = useState(entry.itemId);
  const [dose, setDose] = useState(entry.dose ?? '');
  const items = useLiveQuery(async () => (await recentItems(undefined, 200)).filter((i) => fits(entry.type, i)), [entry.type], [] as Item[]);

  const pick = (id: number) => {
    setItemId(id);
    if (isMed) setDose(items.find((i) => i.id === id)?.dose ?? '');
  };
  const save = async () => {
    await updateEntry(entry.id!, { start: at ?? Date.now(), itemId, dose: isMed ? dose.trim() || undefined : undefined });
    onDone();
  };

  return (
    <>
      <TimeField label="Time" value={at} onChange={setAt} quick={[15]} />
      <h2>Item</h2>
      <Chips options={items.map((i) => i.id!)} selected={itemId !== undefined ? [itemId] : []} onToggle={pick} render={(id) => items.find((i) => i.id === id)!.name} />
      {itemId !== undefined && <Link className="btn ghost" to={`/item/${itemId}`}>Edit item</Link>}
      {!isMed && <ItemIngredients itemId={itemId} />}
      {isMed && (
        <>
          <h2>Dose for this entry</h2>
          <input placeholder="e.g. 200 mg" value={dose} onChange={(e) => setDose(e.target.value)} />
        </>
      )}
      <button className="btn" disabled={itemId === undefined || busy} onClick={() => run(save)}>{busy ? 'Saving…' : 'Save changes'}</button>
      <ErrorText message={error} />
    </>
  );
}
