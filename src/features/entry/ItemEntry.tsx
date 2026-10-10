import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useIngredientNames } from '../../db/hooks';
import { getItemByBarcode, linesFromComponents, logFood, nameKey, recentItems, saveItem } from '../../db/repo';
import type { IngredientLine, Item, ItemKind } from '../../domain/types';
import { fetchProduct, normalizeBarcode } from '../../lib/openfoodfacts';
import { matchItems } from '../../lib/search';
import { ErrorText } from '../../ui/bits';
import { TimeField } from '../../ui/TimeField';
import { useSaving } from '../../ui/useSaving';
import BarcodeSheet from './BarcodeSheet';
import IngredientList from './IngredientList';

/** Comparable fingerprint of an ingredient list, ignoring blank rows. */
const sig = (ls: IngredientLine[]) =>
  JSON.stringify(
    ls
      .filter((l) => l.itemId !== undefined || l.name?.trim())
      .map((l) => [l.name?.trim().toLowerCase() ?? '', l.itemId ?? null, l.qty ?? null, l.unit ?? null, l.note ?? null]),
  );

/** Food and drink entry. Saved items are templates: picking one fills the form so it can be adjusted before logging. */
export default function ItemEntry({ kind }: { kind: 'food' | 'drink' }) {
  const nav = useNavigate();
  const { busy, error, run } = useSaving();
  const [at, setAt] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [lines, setLines] = useState<IngredientLine[]>([]);
  const [tpl, setTpl] = useState<Item | null>(null);
  const [base, setBase] = useState('');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const names = useIngredientNames();
  const saved = useLiveQuery(
    async () =>
      (await recentItems(undefined, 200)).filter((i) => (kind === 'drink' ? i.kind === 'drink' : i.kind === 'food' || i.kind === 'recipe')),
    [kind],
    [] as Item[],
  );

  const pick = async (item: Item) => {
    const ls = await linesFromComponents(item.components);
    setTpl(item);
    setName(item.name);
    setLines(ls);
    setBase(sig(ls));
  };
  const clear = () => {
    setTpl(null);
    setName('');
    setLines([]);
    setBase('');
  };

  /** A scanned or typed barcode: a saved item with it is used as a template, otherwise Open Food Facts fills the form. */
  const handleCode = async (raw: string) => {
    setScanning(false);
    const code = normalizeBarcode(raw);
    if (!code) {
      setScanMsg('That does not look like a barcode.');
      return;
    }
    const known = await getItemByBarcode(code);
    if (known) {
      await pick(known);
      setScanMsg('Loaded your saved item.');
      return;
    }
    setScanMsg('Looking up…');
    setBarcode(code);
    try {
      const p = await fetchProduct(code);
      if (!p.found) {
        setScanMsg('Product not found. Enter it manually; the barcode is saved with it.');
        return;
      }
      setTpl(null);
      setName(p.name);
      setLines(p.ingredients.map((n) => ({ name: n })));
      setScanMsg(p.ingredients.length ? 'Found. Check the ingredients, then save.' : 'Found, but it has no ingredient list. Add them below.');
    } catch {
      setScanMsg('Could not reach Open Food Facts. Enter it manually, or try again later.');
    }
  };

  const changed = tpl !== null && (name.trim() !== tpl.name || sig(lines) !== base);
  const sameName = tpl !== null && nameKey(name) === nameKey(tpl.name);
  const kindFor = (k: ItemKind): ItemKind => (k === 'food' && lines.some((l) => l.itemId !== undefined) ? 'recipe' : k);
  const log = (itemId: number, modified: boolean) =>
    logFood({ type: kind, start: at ?? Date.now(), itemId, lines, modified }).then(() => nav('/'));

  const create = async () => log(await saveItem({ kind: kindFor(kind), name, lines, barcode: barcode || undefined }), false);
  const update = async () => {
    await saveItem({ kind: kindFor(tpl!.kind), name, barcode: tpl!.barcode, lines }, tpl!.id);
    await log(tpl!.id!, false);
  };

  const matches = matchItems(saved, q, names);
  const shown = q.trim() || all ? matches : matches.slice(0, 8);
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <>
      <TimeField label="Time" value={at} onChange={setAt} quick={[15]} />
      <button type="button" className="btn ghost" onClick={() => { setScanMsg(''); setScanning(true); }}>Scan barcode</button>
      {scanMsg && <p role="status" className="empty">{scanMsg}</p>}
      {scanning && <BarcodeSheet onCode={(c) => void handleCode(c)} onClose={() => setScanning(false)} />}

      {saved.length > 0 && (
        <>
          <h2>Saved, tap to use as a starting point</h2>
          <input placeholder="Search saved items or ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="saved-list">
            {shown.map((s) => (
              <button key={s.id} type="button" className="saved-tile" aria-pressed={tpl?.id === s.id} onClick={() => (tpl?.id === s.id ? clear() : void pick(s))}>
                <span>{s.name}</span>
                <small>{s.components.length} ingredients, last used {date(s.lastUsedAt)}</small>
              </button>
            ))}
          </div>
          {q.trim() && shown.length === 0 && <p className="empty">No matches. Use the New form below.</p>}
          {!q.trim() && !all && matches.length > 8 && (
            <button className="btn ghost" onClick={() => setAll(true)}>Show all ({matches.length})</button>
          )}
          <Link to="/manage" className="sub">Manage saved items</Link>
        </>
      )}

      {tpl && (
        <p className="empty">
          From: {tpl.name} <button className="chip" onClick={clear}>Clear</button>
        </p>
      )}
      <h2>{tpl ? 'Adjust' : 'New'}</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <IngredientList lines={lines} onChange={setLines} saved={saved.filter((s) => s.id !== tpl?.id)} />

      <div className="sticky-actions">
        {!tpl && (
          <button className="btn" disabled={!name.trim() || busy} onClick={() => run(create)}>{busy ? 'Saving…' : 'Save and log'}</button>
        )}
        {tpl && !changed && (
          <button className="btn" disabled={busy} onClick={() => run(() => log(tpl.id!, false))}>{busy ? 'Saving…' : 'Log'}</button>
        )}
        {tpl && changed && (
          <>
            <button className="btn" disabled={busy || !name.trim()} onClick={() => run(() => log(tpl.id!, true))}>Log once</button>
            <button className="btn ghost" disabled={busy || sameName} onClick={() => run(create)}>Save as new item and log</button>
            {sameName && <p className="empty">Rename to save as a new item.</p>}
            <button className="btn ghost" disabled={busy || !name.trim()} onClick={() => run(update)}>Update saved item and log</button>
          </>
        )}
        <ErrorText message={error} />
      </div>
    </>
  );
}
