import type { ReactNode } from 'react';
import TideMark from './TideMark';

/** The mark as an empty state: a coral circle resting on a horizon line. With `loading`, the icon oscillates instead. */
export default function EmptyState({ title, children, loading }: { title: string; children?: ReactNode; loading?: boolean }) {
  return (
    <div className="empty-state">
      {loading ? (
        <TideMark mode="loop" size={72} />
      ) : (
        <svg viewBox="0 0 100 60" width="120" height="72" aria-hidden="true">
          <circle cx="50" cy="26" r="17" fill="var(--coral)" />
          <line x1="18" y1="46" x2="82" y2="46" stroke="var(--btn-bg)" strokeWidth="3" strokeLinecap="round" strokeOpacity=".5" />
        </svg>
      )}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
