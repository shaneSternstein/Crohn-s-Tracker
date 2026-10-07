import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { applyItemToEntries, linesFromComponents, recentItems, saveItem } from '../../db/repo';
import type { IngredientLine, Item } from '../../domain/types';
import { ErrorText, Screen } from '../../ui/bits';
import { useSaving } from '../../ui/useSaving';
import IngredientList from './IngredientList';

interface Loaded { item: Item; lines: IngredientLine[]; saved: Item[] }

async function load(id: number): Promise<Loaded | null> {
  const item = await db.items.get(id);
  if (!item) return null;
  const lines = await linesFromComponents(item.components);
  const saved = (await recentItems(undefined, 200)).filter((i) => i.id !== id && i.kind !== 'medication');
  return { item, lines, saved };
}

/** Edits an item itself. Changes apply to every past entry that uses it. */
export default function ItemEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const loaded = useLiveQuery(() => load(Number(id)), [id]);
  const back = () => nav(-1);

  if (loaded === undefined) return <Screen title="Edit item" onBack={back}><p className="empty">Loading…</p></Screen>;
  if (loaded === null) return <Navigate to="/" replace />;
  return (
    <Screen title="Edit item" onBack={back}>
      <ItemForm key={loaded.item.id} {...loaded} onDone={back} />
    </Screen>
  );
}

function ItemForm({ item, lines: initial, saved, onDone }: Loaded & { onDone: () => void }) {
  const isMed = item.kind === 'medication';
  const { busy, error, run } = useSaving();
  const [name, setName] = useState(item.name);
  const [dose, setDose] = useState(item.dose ?? '');
  const [lines, setLines] = useState(initial);
  const [alsoPast, setAlsoPast] = useState(false);

  const save = async () => {
    const hasItems = lines.some((l) => l.itemId !== undefined);
    await saveItem(
      {
        kind: hasItems && item.kind === 'food' ? 'recipe' : item.kind,
        name,
        barcode: item.barcode,
        dose: isMed ? dose.trim() || undefined : undefined,
        lines: isMed ? [] : lines,
      },
      item.id,
    );
    if (alsoPast && !isMed) await applyItemToEntries(item.id!);
    onDone();
  };

  return (
    <>
      <p className="empty">Changes apply to future entries that use this item.</p>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      {isMed ? (
        <input placeholder="Default dose (e.g. 200 mg)" value={dose} onChange={(e) => setDose(e.target.value)} />
      ) : (
        <IngredientList lines={lines} onChange={setLines} saved={saved} />
      )}
      {!isMed && (
        <label className="check">
          <input type="checkbox" checked={alsoPast} onChange={(e) => setAlsoPast(e.target.checked)} />
          Also update past entries that use this item (entries you changed individually are kept)
        </label>
      )}
      <button className="btn" disabled={!name.trim() || busy} onClick={() => run(save)}>{busy ? 'Saving…' : 'Save changes'}</button>
      <ErrorText message={error} />
    </>
  );
}
