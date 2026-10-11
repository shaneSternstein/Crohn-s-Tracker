import { useEffect, useState } from 'react';
import { skyFor } from '../lib/sky';
import { isDark } from '../lib/theme';
import { TIDE_EVENT } from '../lib/tide';
import TideMark from './TideMark';

/** After a save: the icon plays its tide-settle, about 1.3 s in all. Skipped when the phone asks for reduced motion. */
export default function TideOverlay() {
  const [n, setN] = useState(0);
  const [light, setLight] = useState(false);
  useEffect(() => {
    const on = () => {
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Over Home's indigo night background the light version of the icon stands out.
      setLight(window.location.pathname === '/' && !isDark() && skyFor(new Date().getHours()).light);
      setN((v) => v + 1);
    };
    window.addEventListener(TIDE_EVENT, on);
    return () => window.removeEventListener(TIDE_EVENT, on);
  }, []);
  if (!n) return null;
  return (
    <div key={n} className="tide" aria-hidden="true" onAnimationEnd={(e) => { if (e.target === e.currentTarget) setN(0); }}>
      <TideMark mode="once" variant={light ? 'light' : 'indigo'} size={104} />
    </div>
  );
}
