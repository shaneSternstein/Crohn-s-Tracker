import type { EntryType } from './types';

export type Column = 'intake' | 'activity' | 'health';

/** Timeline column per entry type. Labels live here so renaming is a one-line change. */
export const COLUMN_OF: Record<EntryType, Column> = {
  food: 'intake',
  drink: 'intake',
  medication: 'intake',
  activity: 'activity',
  symptom: 'health',
  stool: 'health',
};

export const COLUMN_LABEL: Record<Column, string> = {
  intake: 'Intake',
  activity: 'Activity',
  health: 'Health',
};

export const COLUMN_COLOR: Record<Column, string> = {
  intake: 'var(--food)',
  activity: 'var(--activity)',
  health: 'var(--symptom)',
};
