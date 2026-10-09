import type { ReactNode } from 'react';

export type IconName = 'food' | 'drink' | 'medication' | 'symptom' | 'stool' | 'activity' | 'sleep' | 'water';

const PATHS: Record<IconName, ReactNode> = {
  food: (
    <>
      <path d="M4 3v5.5a3.5 3.5 0 0 0 7 0V3M7.5 3v18" />
      <path d="M19 21V3c-2.2 1.2-3.5 4-3.5 7.5 0 1.5 1 2.5 3.5 2.5" />
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
      <path d="M6 2.5h12v6H6z" />
      <path d="M11.2 5.5h1.6" />
      <path d="M6 11V9.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V11" />
      <path d="M4 11h16c0 3.5-2 6-5 6.5v2H9v-2C6 17 4 14.5 4 11z" />
      <path d="M7 21.5h10" />
    </>
  ),
  activity: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l3-7h7l2 7M11 16l5-7M11 16L9 9M7.5 9h3M16 9l-.8-2.5h2.3" />
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
