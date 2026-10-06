import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logSleep } from '../../db/repo';

const at = (hhmm: string, dayOffset: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.getTime();
};

export default function SleepEntry() {
  const nav = useNavigate();
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const wakeAt = at(wake, 0);
  const bedAt = at(bed, at(bed, 0) >= wakeAt ? -1 : 0);
  const hours = ((wakeAt - bedAt) / 3_600_000).toFixed(1);

  return (
    <>
      <h2>Bedtime</h2>
      <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
      <h2>Wake time</h2>
      <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
      <p>{hours} h</p>
      <button className="btn" onClick={async () => { await logSleep(bedAt, wakeAt); nav('/'); }}>Save</button>
    </>
  );
}
