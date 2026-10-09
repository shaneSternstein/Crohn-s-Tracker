import type { CSSProperties } from 'react';

export interface Seg { key: string; label: string; color: string }
export interface Bar { day: number; parts: number[] } // parts align with segs

interface Props {
  bars: Bar[];
  segs: Seg[];
  avg: (number | null)[]; // one per bar
  height: number;
  labels?: boolean; // x-axis date labels
  onPick: (day: number) => void;
}

const W = 360;
const PL = 30;
const PR = 8;
const PT = 8;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const tick = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const dateLabel = (t: number, long = false) =>
  new Date(t).toLocaleDateString(undefined, long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].map((m) => m * p).find((m) => m >= v) ?? v);
}

/** Hand-built stacked bar chart with a 7-day average line. Same width and padding in every instance, so panels align. */
export default function StackedBars({ bars, segs, avg, height, labels = false, onPick }: Props) {
  const PB = labels ? 20 : 6;
  const plotW = W - PL - PR;
  const plotH = height - PT - PB;
  const n = bars.length;
  const slot = plotW / n;
  const bw = Math.max(1.5, slot * 0.72);
  const max = niceMax(Math.max(0, ...bars.map((b) => sum(b.parts)), ...avg.filter((v): v is number => v !== null)));
  const y = (v: number) => PT + plotH - (v / max) * plotH;
  const cx = (i: number) => PL + i * slot + slot / 2;
  const step = Math.ceil(n / 6);

  let path = '';
  let pen = false;
  avg.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    path += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%">
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line className="grid-line" x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} />
            <text x={PL - 4} y={y(v)} textAnchor="end" dominantBaseline="central">{tick(v)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          let cum = 0;
          return (
            <g key={b.day}>
              {b.parts.map((p, k) => {
                if (p <= 0) return null;
                const top = y(cum + p);
                const h = y(cum) - top;
                cum += p;
                return <rect key={segs[k].key} x={cx(i) - bw / 2} y={top} width={bw} height={h} style={{ fill: segs[k].color } as CSSProperties} />;
              })}
            </g>
          );
        })}
        {path && <path className="avg-line" d={path} />}
        {labels &&
          bars.map((b, i) =>
            i % step === 0 || i === n - 1 ? (
              <text key={b.day} x={cx(i)} y={height - 6} textAnchor="middle">{dateLabel(b.day)}</text>
            ) : null,
          )}
        {bars.map((b, i) => (
          <rect
            key={b.day}
            className="tap"
            x={PL + i * slot}
            y={PT}
            width={slot}
            height={plotH}
            role="button"
            aria-label={`Open ${dateLabel(b.day, true)}`}
            onClick={() => onPick(b.day)}
          />
        ))}
      </svg>
      <div className="legend">
        {segs.map((s) => (
          <span key={s.key}><i className="sw" style={{ background: s.color }} />{s.label}</span>
        ))}
        <span><i className="sw line" />7-day average</span>
      </div>
    </>
  );
}
