import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { runStage1, type Cell } from '../../analysis/stage1';
import { outcomeFromKey, type OutcomeKey } from '../../analysis/triggers';
import type { Entry } from '../../domain/types';

/** Loads all entries and runs Stage 1 for the outcome after the screen has painted. `cells` is null while calculating. */
export function useStage1(key: OutcomeKey): { entries: Entry[]; cells: Cell[] | null } {
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const [state, setState] = useState<{ key: OutcomeKey; cells: Cell[] } | null>(null);

  useEffect(() => {
    if (!entries) return;
    let live = true;
    const timer = window.setTimeout(() => {
      const cells = runStage1(entries, outcomeFromKey(key));
      if (live) setState({ key, cells });
    }, 30);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [entries, key]);

  return { entries: entries ?? [], cells: state && state.key === key ? state.cells : null };
}
