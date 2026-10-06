import { db } from './schema';
import type { Preset } from '../domain/types';

const symptoms = [
  'Pain', 'Cramping', 'Bloating', 'Nausea', 'Urgency', 'Diarrhea',
  'Constipation', 'Gas', 'Reflux', 'Fatigue', 'Headache', 'Joint pain',
];
const activities = ['Walk', 'Run', 'Workout', 'Yoga', 'Stretching', 'Stress'];
const stoolTags = ['Urgency', 'Blood', 'Mucus', 'Incomplete'];

export async function seedIfEmpty(): Promise<void> {
  if ((await db.presets.count()) > 0) return;
  const rows: Preset[] = [
    ...symptoms.map((label) => ({ type: 'symptom' as const, label })),
    ...activities.map((label) => ({ type: 'activity' as const, label })),
    ...stoolTags.map((label) => ({ type: 'stool' as const, label })),
  ];
  await db.presets.bulkAdd(rows);
}
