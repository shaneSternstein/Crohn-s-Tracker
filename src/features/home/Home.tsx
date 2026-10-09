import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { backupDue, lastBackupAt } from '../../lib/backup';
import { Icon, type IconName } from '../../ui/icons';
import WaterTile from './WaterTile';

const TILES: { to: string; label: string; from: string; to2: string; icon: IconName }[] = [
  { to: '/add/food', label: 'Food', from: '#BCCBAD', to2: '#A2B590', icon: 'food' },
  { to: '/add/drink', label: 'Drink', from: '#A8BEA0', to2: '#8FA987', icon: 'drink' },
  { to: '/add/medication', label: 'Medication', from: '#C3CCA3', to2: '#ABB78B', icon: 'medication' },
  { to: '/add/symptom', label: 'Symptom', from: '#DB8F72', to2: '#C46A50', icon: 'symptom' },
  { to: '/add/stool', label: 'Stool', from: '#CC7D64', to2: '#B45E48', icon: 'stool' },
  { to: '/add/activity', label: 'Activity', from: '#F2D88E', to2: '#E3BC60', icon: 'activity' },
  { to: '/add/sleep', label: 'Sleep', from: '#9CA6CC', to2: '#7B88B8', icon: 'sleep' },
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
