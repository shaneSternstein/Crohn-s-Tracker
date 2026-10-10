import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIngredientNames } from '../../db/hooks';
import type { Cell } from '../../analysis/stage1';
import { OUTCOME_KEYS, isOutcomeKey, loggedDayCount, rankTriggers, symptomCounts } from '../../analysis/triggers';
import { LAG_WINDOWS } from '../../analysis/windows';
import { Tag, cap, fmt } from './Tag';
import { useStage1 } from './useStage1';

const windowLabel = (c: Cell) => LAG_WINDOWS.find((w) => w.key === c.window)!.label;

/** Ranked ingredient list and lag map for one outcome. Results are associations, not causes. */
export default function Triggers() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('o');
  const o = isOutcomeKey(raw) ? raw : 'all';
  const view = params.get('v') === 'map' ? 'map' : 'list';
  const [showAll, setShowAll] = useState(false);
  const names = useIngredientNames();
  const { entries, cells } = useStage1(o);

  const set = (patch: Record<string, string>) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      Object.entries(patch).forEach(([k, v]) => n.set(k, v));
      return n;
    }, { replace: true });

  const days = useMemo(() => loggedDayCount(entries), [entries]);
  const symptoms = useMemo(() => symptomCounts(entries), [entries]);
  const ranked = useMemo(() => (cells ? rankTriggers(cells) : null), [cells]);
  const name = (id: number) => cap(names.get(id) ?? '?');
  const link = (id: number) => `/triggers/${id}?o=${encodeURIComponent(o)}`;

  const rows = ranked?.rows ?? [];
  const shown = showAll ? rows : rows.filter((r) => r.reliability !== 'none');
  const hidden = rows.length - shown.length;

  // Lag map: top ingredients by the same ordering, shaded by increase relative to the largest shown.
  const mapIds = shown.slice(0, 15).map((r) => r.ingredientId);
  const byKey = new Map((cells ?? []).map((c) => [`${c.ingredientId}:${c.window}`, c] as const));
  const maxEffect = Math.max(
    0.0001,
    ...mapIds.flatMap((id) => LAG_WINDOWS.map((w) => byKey.get(`${id}:${w.key}`)?.effect ?? 0)),
  );

  return (
    <>
      <div className="chips" role="group" aria-label="Outcome">
        {OUTCOME_KEYS.map((k) => (
          <button key={k} className="chip" aria-pressed={o === k} onClick={() => set({ o: k })}>
            {k === 'all' ? 'Overall' : k}
          </button>
        ))}
      </div>
      {symptoms.length > 0 && (
        <select aria-label="Single symptom" value={o.startsWith('s:') ? o : ''} onChange={(e) => e.target.value && set({ o: e.target.value })}>
          <option value="">Single symptom…</option>
          {symptoms.map((s) => <option key={s.label} value={`s:${s.label}`}>{s.label} ({s.count})</option>)}
        </select>
      )}
      <p className="sub">{days} days with food or drink logged. Results are most useful after about 28 days.</p>
      <div className="seg" role="group" aria-label="Layout">
        <button aria-pressed={view === 'list'} onClick={() => set({ v: 'list' })}>List</button>
        <button aria-pressed={view === 'map'} onClick={() => set({ v: 'map' })}>Lag map</button>
      </div>

      {!ranked ? (
        <p className="empty">Calculating…</p>
      ) : shown.length === 0 ? (
        <p className="empty">No ingredient shows higher burden after exposure yet.</p>
      ) : view === 'list' ? (
        <ul className="list">
          {shown.map((c) => (
            <li key={c.ingredientId} className="li" style={{ '--c': 'var(--terracotta)' } as CSSProperties}>
              <Link className="grow row-link" to={link(c.ingredientId)}>
                <span>{name(c.ingredientId)}</span>
                <small className="sub">{windowLabel(c)} · {fmt(c.exposedMean)} vs {fmt(c.baselineMean)} · {c.n} exposures</small>
              </Link>
              <Tag level={c.reliability} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="lag">
          <span />
          {LAG_WINDOWS.map((w) => <span key={w.key} className="cal-wd">{w.from}–{w.to} h</span>)}
          {mapIds.map((id) => (
            <LagRow key={id} id={id} label={name(id)} byKey={byKey} maxEffect={maxEffect} to={link(id)} />
          ))}
        </div>
      )}

      {ranked && hidden > 0 && (
        <button className="btn ghost" onClick={() => setShowAll(true)}>Show {hidden} with no clear association</button>
      )}
      {ranked && ranked.needMore > 0 && <p className="sub">{ranked.needMore} ingredients need more data.</p>}
      <p className="sub">Associations, not causes. Not medical advice.</p>
    </>
  );
}

function LagRow({ id, label, byKey, maxEffect, to }: { id: number; label: string; byKey: Map<string, Cell>; maxEffect: number; to: string }) {
  return (
    <>
      <Link className="lag-name" to={to}>{label}</Link>
      {LAG_WINDOWS.map((w) => {
        const c = byKey.get(`${id}:${w.key}`);
        const ok = c?.effect !== undefined;
        const shade = !ok ? undefined : c!.effect! <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * c!.effect!) / maxEffect)));
        return (
          <Link key={w.key} className="lag-cell" data-shade={shade} to={to} aria-label={`${label}, ${w.label}`}>
            {ok ? fmt(c!.effect) : '–'}
          </Link>
        );
      })}
    </>
  );
}
