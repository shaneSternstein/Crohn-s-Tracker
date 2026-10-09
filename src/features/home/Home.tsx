import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { backupDue, lastBackupAt } from '../../lib/backup';
import { Icon, type IconName } from '../../ui/icons';
import WaterTile from './WaterTile';

const TILES: { to: string; label: string; color: string; icon: IconName }[] = [
  { to: '/add/food', label: 'Food', color: 'var(--food)', icon: 'food' },
  { to: '/add/drink', label: 'Drink', color: 'var(--food)', icon: 'drink' },
  { to: '/add/medication', label: 'Medication', color: 'var(--food)', icon: 'medication' },
  { to: '/add/symptom', label: 'Symptom', color: 'var(--symptom)', icon: 'symptom' },
  { to: '/add/stool', label: 'Stool', color: 'var(--symptom)', icon: 'stool' },
  { to: '/add/activity', label: 'Activity', color: 'var(--activity)', icon: 'activity' },
  { to: '/add/sleep', label: 'Sleep', color: 'var(--sky)', icon: 'sleep' },
];
const tint = (c: string) => ({ '--tile': c }) as CSSProperties;

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
  return (
    <main className="screen">
      <header className="home-head">
        <h1>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
        <Link to="/settings" className="chip">Settings</Link>
      </header>
      <BackupReminder />
      <div className="tiles">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="tile" style={tint(t.color)}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        ))}
        <WaterTile />
      </div>
    </main>
  );
}
