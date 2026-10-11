import { useEffect, useState } from 'react';
import { TIDE_EVENT } from '../lib/tide';

/** A coral circle settles onto a horizon line, about 0.9 s in total. Skipped when the phone asks for reduced motion. */
export default function TideOverlay() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => {
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setN((v) => v + 1);
    };
    window.addEventListener(TIDE_EVENT, on);
    return () => window.removeEventListener(TIDE_EVENT, on);
  }, []);
  if (!n) return null;
  return (
    <div key={n} className="tide" aria-hidden="true" onAnimationEnd={(e) => { if (e.target === e.currentTarget) setN(0); }}>
      <svg className="tide-card" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="tide-bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0" stopColor="#6A74F0" />
            <stop offset="1" stopColor="#3A44C2" />
          </linearGradient>
          <linearGradient id="tide-dot" gradientUnits="userSpaceOnUse" x1="38" y1="34" x2="62" y2="62">
            <stop offset="0" stopColor="#FFA897" />
            <stop offset="1" stopColor="#F26F5E" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#tide-bg)" />
        <line x1="26" y1="66" x2="74" y2="66" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity=".9" />
        <g className="tide-dot"><circle cx="50" cy="45" r="19" fill="url(#tide-dot)" /></g>
      </svg>
    </div>
  );
}
