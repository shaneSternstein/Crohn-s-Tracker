import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { backupDue, lastBackupAt } from '../../lib/backup';
import { skyFor } from '../../lib/sky';
import { isDark } from '../../lib/theme';
import { Icon, type IconName } from '../../ui/icons';
import WaterTile from './WaterTile';

const WHITE = '#FFFFFF';
const TILES: { to: string; label: string; from: string; to2: string; icon: IconName; fg?: string }[] = [
  { to: '/add/food', label: 'Food', from: '#CFEBE1', to2: '#8FD0BC', icon: 'food' },
  { to: '/add/drink', label: 'Drink', from: '#BFE5DA', to2: '#7CC8B2', icon: 'drink' },
  { to: '/add/medication', label: 'Medication', from: '#D6EEDF', to2: '#9BD6B5', icon: 'medication' },
  { to: '/add/symptom', label: 'Symptom', from: '#FFB3A6', to2: '#F27A69', icon: 'symptom' },
  { to: '/add/stool', label: 'Stool', from: '#FFA395', to2: '#E5614F', icon: 'stool' },
  { to: '/add/activity', label: 'Activity', from: '#FFE3A3', to2: '#F7BE4B', icon: 'activity' },
  { to: '/add/sleep', label: 'Sleep', from: '#8F9AFF', to2: '#5560E0', icon: 'sleep', fg: WHITE },
];
const tint = (a: string, b: string, fg?: string) => ({ '--from': a, '--to': b, ...(fg ? { '--fg': fg } : {}) }) as CSSProperties;

function BackupReminder() {
  const hasData = useLiveQuery(async () => (await db.entries.count()) > 0, [], false);
  if (!hasData || !backupDue()) return null;
  const last = lastBackupAt();
  return (
    <Link to="/settings" className="banner">
      Back up your data
      <small>{last ? `Last backup ${Math.floor((Date.now() - last) / 86_400_000)} days ago` : 'No backup yet'}</small>
    </Link>
  );
}

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 600_000);
    return () => window.clearInterval(t);
  }, []);
  // The background follows the time of day (light themes only).
  const sky = isDark() ? null : skyFor(now.getHours());

  return (
    <>
      {sky && <div className="sky" aria-hidden="true" style={{ background: `linear-gradient(180deg, ${sky.from}, ${sky.to})` }} />}
      <main className="screen" style={sky?.light ? ({ '--home-fg': '#F4F6FF' } as CSSProperties) : undefined}>
        <header className="home-head">
          <h1>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
          <Link to="/settings" className="chip">Settings</Link>
        </header>
        <BackupReminder />
        <div className="tiles">
          {TILES.map((t) => (
            <Link key={t.to} to={t.to} className="tile" style={tint(t.from, t.to2, t.fg)}>
              <Icon name={t.icon} />
              {t.label}
            </Link>
          ))}
          <WaterTile />
        </div>
      </main>
    </>
  );
}
