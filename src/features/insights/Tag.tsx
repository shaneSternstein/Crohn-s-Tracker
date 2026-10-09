import type { Reliability } from '../../analysis/stage1';

const LABEL: Record<Reliability, string> = {
  strong: 'Strong', moderate: 'Moderate', weak: 'Weak', none: 'None', insufficient: 'Needs data',
};

export const Tag = ({ level }: { level: Reliability }) => <span className="tag" data-r={level}>{LABEL[level]}</span>;

export const fmt = (v?: number) => (v === undefined ? '–' : String(Math.round(v * 10) / 10));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
