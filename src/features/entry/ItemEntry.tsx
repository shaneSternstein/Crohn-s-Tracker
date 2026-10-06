import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { addEntry, recentItems, saveItem } from '../../db/repo';
import type { IngredientLine, Item } from '../../domain/types';
import { presetToTime } from '../../lib/time';
import { Chips, StartPicker } from '../../ui/bits';
import IngredientList from './IngredientList';

export default function ItemEntry({ kind }: { kind: 'food' | 'drink' }) {
  const nav = useNavigate();
  const [mins, setMins] = useState(0);
  const [name, setName] = useState('');
  const [lines, setLines] = useState<IngredientLine[]>([]);
  const saved = useLiveQuery(
    async () =>
      (await recentItems(undefined, 80)).filter((i) => (kind === 'drink' ? i.kind === 'drink' : i.kind === 'food' || i.kind === 'recipe')),
    [kind],
    [] as Item[],
  );

  const log = async (itemId: number) => {
    await addEntry({ type: kind, start: presetToTime(mins), ongoing: false, itemId });
    nav('/');
  };
  const create = async () => {
    const hasItems = lines.some((l) => l.itemId !== undefined);
    await log(await saveItem({ kind: hasItems ? 'recipe' : kind, name, lines }));
  };

  return (
    <>
      <StartPicker value={mins} onChange={setMins} />
      {saved.length > 0 && (
        <>
          <h2>Saved</h2>
          <Chips options={saved.map((s) => s.id!)} selected={[]} onToggle={log} render={(id) => saved.find((s) => s.id === id)!.name} />
        </>
      )}
      <h2>New</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <IngredientList lines={lines} onChange={setLines} saved={saved} />
      <button className="btn" disabled={!name.trim()} onClick={create}>Save and log</button>
    </>
  );
}
