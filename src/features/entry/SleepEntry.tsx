import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logSleep, updateSleep } from '../../db/repo';
import type { SleepLog } from '../../domain/types';
import { ErrorText } from '../../ui/bits';
import { useSaving } from '../../ui/useSaving';

const at = (hhmm: string, dayOffset: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.getTime();
};
/** Value for a datetime-local input, in local time. */
const local = (t: number) => {
  const d = new Date(t);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** Create mode takes two clock times (last night). Edit mode takes full date-times so any night can be corrected. */
export default function SleepEntry({ log, onDone }: { log?: SleepLog; onDone?: () => void }) {
  const nav = useNavigate();
  const { busy, error, run } = useSaving();
  const editing = log !== undefined;
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [bedFull, setBedFull] = useState(log ? local(log.start) : '');
  const [wakeFull, setWakeFull] = useState(log ? local(log.end) : '');

  const wakeNew = at(wake, 0);
  const [bedAt, wakeAt] = editing
    ? [new Date(bedFull).getTime(), new Date(wakeFull).getTime()]
    : [at(bed, at(bed, 0) >= wakeNew ? -1 : 0), wakeNew];
  const valid = Number.isFinite(bedAt) && Number.isFinite(wakeAt) && wakeAt > bedAt;
  const hours = valid ? ((wakeAt - bedAt) / 3_600_000).toFixed(1) : '–';

  const save = async () => {
    if (log) await updateSleep(log.id!, bedAt, wakeAt);
    else await logSleep(bedAt, wakeAt);
    (onDone ?? (() => nav('/')))();
  };

  return (
    <>
      <h2>Bedtime</h2>
      {editing
        ? <input type="datetime-local" value={bedFull} onChange={(e) => setBedFull(e.target.value)} />
        : <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />}
      <h2>Wake time</h2>
      {editing
        ? <input type="datetime-local" value={wakeFull} onChange={(e) => setWakeFull(e.target.value)} />
        : <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />}
      <p>{hours} h</p>
      {!valid && <p className="empty">Wake time must be after bedtime.</p>}
      <button className="btn" disabled={busy || !valid} onClick={() => run(save)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save'}</button>
      <ErrorText message={error} />
    </>
  );
}
