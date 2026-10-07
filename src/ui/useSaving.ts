import { useRef, useState } from 'react';

/** Guards async saves: blocks double taps (sync ref) and surfaces failures instead of failing silently. */
export function useSaving() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await fn(); // callers navigate away on success, so busy stays true until unmount
    } catch (e) {
      running.current = false;
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };
  return { busy, error, run };
}
