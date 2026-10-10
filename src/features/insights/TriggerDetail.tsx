import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { setIngredientHidden } from '../../db/repo';
import { useIngredientNames } from '../../db/hooks';
import { MIN_EXPOSURES, type Cell } from '../../analysis/stage1';
import { better, exposureList, isOutcomeKey, outcomeFromKey } from '../../analysis/triggers';
import { LAG_WINDOWS } from '../../analysis/windows';
import type { Item } from '../../domain/types';
import { startOfDay } from '../../lib/time';
import { Screen } from '../../ui/bits';
import { labelOf } from '../timeline/label';
import { Tag, cap, fmt } from './Tag';
import { useStage1 } from './useStage1';

const NO_ITEMS = new Map<number, Item>();
const EMPTY = new Map<number, Item>();
const when = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** One ingredient: what the engine found per time window, and every exposure with the symptoms that followed. */
export default function TriggerDetail() {
  const { id } = useParams();
  const ingredientId = Number(id);
  const [params] = useSearchParams();
  const raw = params.get('o');
  const o = isOutcomeKey(raw) ? raw : 'all';
  const nav = useNavigate();
  const [details, setDetails] = useState(false);
  const names = useIngredientNames();
  const items = useLiveQuery(async () => new Map((await db.items.toArray()).map((i) => [i.id!, i] as const)), [], NO_ITEMS);
  const { entries, cells } = useStage1(o);

  const mine = useMemo(() => (cells ?? []).filter((c) => c.ingredientId === ingredientId), [cells, ingredientId]);
  const exposures = useMemo(() => exposureList(entries, ingredientId, outcomeFromKey(o)), [entries, ingredientId, o]);

  const estimated = mine.filter((c) => c.effect !== undefined);
  const best = estimated.reduce<Cell | null>((a, c) => (!a || better(c, a) ? c : a), null);
  const windowLabel = (c: Cell) => LAG_WINDOWS.find((w) => w.key === c.window)!.label;

  let summary = 'Calculating…';
  if (cells) {
    if (!best) summary = `Not enough data yet. Each time window needs at least ${MIN_EXPOSURES} exposures.`;
    else if (best.effect! <= 0) summary = 'No increase in burden after this ingredient was found.';
    else
      summary = `In the ${windowLabel(best)} after, burden averaged ${fmt(best.exposedMean)}, compared with ${fmt(best.baselineMean)} at the same time of day without it (${best.n} exposures).`;
  }

  return (
    <Screen title={cap(names.get(ingredientId) ?? 'Ingredient')} onBack={() => nav(-1)}>
      <p>{summary}</p>

      {cells && (
        <>
          <h2>By time window</h2>
          <ul className="list">
            {LAG_WINDOWS.map((w) => {
              const c = mine.find((x) => x.window === w.key);
              return (
                <li key={w.key} className="li" style={{ '--c': 'var(--surface-2)' } as CSSProperties}>
                  <div className="grow row-link">
                    <span>{w.label}</span>
                    <small className="sub">
                      {c?.effect === undefined
                        ? `${c?.n ?? 0} exposures, needs ${MIN_EXPOSURES}`
                        : `${fmt(c.exposedMean)} vs ${fmt(c.baselineMean)} · ${c.n} exposures`}
                    </small>
                    {details && c?.p !== undefined && (
                      <small className="sub">p {c.p.toFixed(3)}, corrected {c.q!.toFixed(3)}</small>
                    )}
                  </div>
                  <Tag level={c?.reliability ?? 'insufficient'} />
                </li>
              );
            })}
          </ul>
          <button className="btn ghost" onClick={() => setDetails(!details)}>{details ? 'Hide details' : 'Details'}</button>
        </>
      )}

      <h2>Every time</h2>
      {exposures.length === 0 ? (
        <p className="empty">No entries include this ingredient.</p>
      ) : (
        <ul className="list">
          {exposures.map(({ entry, followups }) => (
            <li key={entry.id} className="li" style={{ '--c': 'var(--food)' } as CSSProperties}>
              <time>{when(entry.start)}</time>
              <Link className="grow row-link" to={`/timeline?d=${startOfDay(entry.start)}`}>
                <span>{labelOf(entry, items ?? EMPTY)}</span>
                <small className="sub">
                  {followups.length === 0
                    ? 'None in the next 48 h'
                    : followups.map((f) => `${labelOf(f.entry, EMPTY)} +${Math.round(f.hoursAfter)} h`).join(', ')}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button className="btn ghost" onClick={() => void setIngredientHidden(ingredientId, true).then(() => nav(-1))}>
        Hide from results
      </button>
      <p className="sub">Associations, not causes. Not medical advice. Hidden ingredients can be restored in Settings.</p>
    </Screen>
  );
}
