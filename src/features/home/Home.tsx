import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { backupDue, lastBackupAt } from '../../lib/backup';
import { Icon, type IconName } from '../../ui/icons';
import WaterTile from './WaterTile';

const TILES: { to: string; label: string; from: string; to2: string; icon: IconName }[] = [
  { to: '/add/food', label: 'Food', from: '#CED9C3', to2: '#95AB81', icon: 'food' },
  { to: '/add/drink', label: 'Drink', from: '#BBCDB5', to2: '#819E78', icon: 'drink' },
  { to: '/add/medication', label: 'Medication', from: '#D2D9BA', to2: '#A0AD7B', icon: 'medication' },
  { to: '/add/symptom', label: 'Symptom', from: '#E2A68E', to2: '#C06045', icon: 'symptom' },
  { to: '/add/stool', label: 'Stool', from: '#D5947F', to2: '#B45E48', icon: 'stool' },
  { to: '/add/activity', label: 'Activity', from: '#F6E3AE', to2: '#DFB34A', icon: 'activity' },
  { to: '/add/sleep', label: 'Sleep', from: '#B4BBD8', to2: '#6A79AF', icon: 'sleep' },
];
const tint = (a: string, b: string) => ({ '--from': a, '--to': b }) as CSSProperties;

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
          <Link key={t.to} to={t.to} className="tile" style={tint(t.from, t.to2)}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        ))}
        <WaterTile />
      </div>
    </main>
  );
}
