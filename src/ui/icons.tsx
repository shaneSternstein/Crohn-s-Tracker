import type { ReactNode } from 'react';

export type IconName = 'food' | 'drink' | 'medication' | 'symptom' | 'stool' | 'activity' | 'sleep' | 'water';

const PATHS: Record<IconName, ReactNode> = {
  food: (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18" />
      <path d="M17 21V3c-2 1-3.5 4-3.5 7.5 0 1.5 1 2.5 3.5 2.5" />
    </>
  ),
  drink: (
    <>
      <path d="M7 3h10l-1.2 17a1 1 0 0 1-1 .9H9.2a1 1 0 0 1-1-.9z" />
      <path d="M7.6 9h8.8" />
    </>
  ),
  medication: (
    <g transform="rotate(-45 12 12)">
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" />
      <path d="M12 8.5v7" />
    </g>
  ),
  symptom: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  stool: (
    <>
      <path d="M6 3h8v5H6z" />
      <path d="M4 10h16c0 4-2.5 7-6 7h-4c-3.5 0-6-3-6-7z" />
      <path d="M9 17v4h6v-4" />
    </>
  ),
  activity: (
    <>
      <circle cx="15" cy="4.5" r="1.8" />
      <path d="M14 8.5l-2 5.5 3 2.5 1 4.5M12 14l-3.5 1.5M13.5 10l-3.5.5-2 2.5M13.5 10l3 2.5 2.5-.5" />
    </>
  ),
  sleep: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
};

/** Simple line icon, drawn with the current text color. */
export const Icon = ({ name }: { name: IconName }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {PATHS[name]}
  </svg>
);
