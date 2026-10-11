/** The ebb wordmark, drawn from circles and lines. Letters take the current color; the e's bar is coral. */
export default function Wordmark({ height = 36 }: { height?: number }) {
  return (
    <svg className="wordmark" viewBox="0 0 164 84" height={height} role="img" aria-label="Ebb" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M43 52A17 17 0 1 0 35.75 65.93" stroke="currentColor" />
      <path d="M9 52H43" stroke="var(--coral)" />
      <path d="M65 13.75V69" stroke="currentColor" />
      <circle cx="82" cy="52" r="17" stroke="currentColor" />
      <path d="M121 13.75V69" stroke="currentColor" />
      <circle cx="138" cy="52" r="17" stroke="currentColor" />
    </svg>
  );
}
