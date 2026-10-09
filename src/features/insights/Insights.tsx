import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { entriesBetween } from '../../db/repo';
import {
  BOWEL_GROUPS, SYMPTOM_GROUPS, dailyStats, movingAverage, type BowelGroup, type SymptomGroup,
} from '../../analysis/burden';
import type { Entry } from '../../domain/types';
import { dayRange, daysEnding, startOfDay } from '../../lib/time';
import { Screen } from '../../ui/bits';
import Heatmap from './Heatmap';
import StackedBars, { type Seg } from './StackedBars';

const RANGES = [14, 30, 90] as const;
const AVG = 7;

const BOWEL_COLOR: Record<BowelGroup, string> = {
  Constipated: 'var(--butter)', Normal: 'var(--sage)', 'Low fiber': 'var(--sky)', Loose: 'var(--terracotta)',
};
const SYMPTOM_COLOR: Record<SymptomGroup, string> = {
  Pain: 'var(--terracotta)', Digestive: 'var(--butter)', Systemic: 'var(--sky)', Other: 'var(--plum)',
};
const BOWEL_SEGS: Seg[] = BOWEL_GROUPS.map((g) => ({ key: g, label: g, color: BOWEL_COLOR[g] }));
const SYMPTOM_SEGS: Seg[] = SYMPTOM_GROUPS.map((g) => ({ key: g, label: g, color: SYMPTOM_COLOR[g] }));

export default function Insights() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const range = RANGES.find((r) => r === Number(params.get('r'))) ?? 30;

  const today = startOfDay();
  // Extra leading days so the 7-day average is complete on the first visible day.
  const days = useMemo(() => daysEnding(range + AVG - 1, today), [range, today]);
  const to = dayRange(today)[1];
  const entries = useLiveQuery(() => entriesBetween(days[0], to), [days, to], [] as Entry[]);
  const stats = useMemo(() => dailyStats(entries, days), [entries, days]);

  const shown = stats.slice(AVG - 1);
  const avgOf = (pick: (s: (typeof stats)[number]) => number) =>
    movingAverage(stats.map((s) => (s.hasData ? pick(s) : null)), AVG).slice(AVG - 1);

  const bowelBars = shown.map((s) => ({ day: s.day, parts: BOWEL_GROUPS.map((g) => s.bowel[g]) }));
  const symptomBars = shown.map((s) => ({ day: s.day, parts: SYMPTOM_GROUPS.map((g) => s.symptom[g]) }));
  const open = (day: number) => nav(`/timeline?d=${day}`);

  return (
    <Screen title="Insights" noBack>
      <div className="seg" role="group" aria-label="Range">
        {RANGES.map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setParams({ r: String(r) }, { replace: true })}>
            {r} days
          </button>
        ))}
      </div>

      {!shown.some((s) => s.hasData) ? (
        <p className="empty">No entries in this range.</p>
      ) : (
        <>
          <section className="panel">
            <h2>Bowel movements per day</h2>
            <StackedBars bars={bowelBars} segs={BOWEL_SEGS} avg={avgOf((s) => s.bowelCount)} height={150} onPick={open} />
          </section>
          <section className="panel">
            <h2>Symptom burden per day</h2>
            <StackedBars bars={symptomBars} segs={SYMPTOM_SEGS} avg={avgOf((s) => s.symptomTotal)} height={170} labels onPick={open} />
          </section>
          <p className="sub">Burden is severity times hours, up to 6 hours per entry. Days with no entries are left blank. Tap a day to open it.</p>
        </>
      )}
      <section className="panel">
        <h2>Daily burden</h2>
        <Heatmap />
      </section>
    </Screen>
  );
}
