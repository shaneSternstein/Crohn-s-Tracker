import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addWater, hydrationTotal, lastWater, undoLastWater } from '../../db/repo';
import { ML_PER_CUP, toCups } from '../../domain/hydration';
import { dayRange } from '../../lib/time';
import { Icon } from '../../ui/icons';

const QUICK = [0.5, 2, 4];
const STEP = 0.5;
const cupsLabel = (c: number) => `${c} ${c === 1 ? 'cup' : 'cups'}`;
const add = (cups: number) => addWater(Math.round(cups * ML_PER_CUP));

/** Half-width tile: tap adds 1 cup; the more button opens a sheet with other amounts and undo. */
export default function WaterTile() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState(1.5);
  const [err, setErr] = useState('');
  const total = useLiveQuery(() => hydrationTotal(...dayRange()), [], 0);
  const last = useLiveQuery(() => lastWater(), [], undefined);

  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Could not save.');
  const quick = () => Promise.resolve(add(1)).then(() => setErr(''), fail);
  const act = (fn: () => unknown) => async () => {
    try {
      await fn();
      setErr('');
      setOpen(false);
      setCustom(false);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <>
      <div className="tile water-tile">
        <button className="water-main" onClick={quick}>
          <Icon name="water" />
          <span>Water</span>
          <small>{cupsLabel(toCups(total))} today, tap +1</small>
          {err && <small role="alert" className="error">{err}</small>}
        </button>
        <button className="water-more" aria-label="More water options" onClick={() => setOpen(true)}>⋯</button>
      </div>

      {open && (
        <div className="sheet-bg" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Add water" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong>Add water</strong>
              <button className="chip" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="chips">
              {QUICK.map((c) => (
                <button key={c} className="chip" onClick={act(() => add(c))}>+{c}</button>
              ))}
              <button className="chip" aria-pressed={custom} onClick={() => setCustom(!custom)}>Custom</button>
            </div>
            {custom && (
              <div className="stepper">
                <button className="chip" aria-label="Decrease" disabled={amount <= STEP} onClick={() => setAmount(amount - STEP)}>−</button>
                <strong>{cupsLabel(amount)}</strong>
                <button className="chip" aria-label="Increase" onClick={() => setAmount(amount + STEP)}>+</button>
                <button className="btn" onClick={act(() => add(amount))}>Add</button>
              </div>
            )}
            {last && (
              <button className="undo" onClick={act(undoLastWater)}>
                Undo last (+{cupsLabel(toCups(last.ml))})
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
