import type { Bristol } from './types';

export const BRISTOL_INFO: Record<Bristol, { desc: string; group: string }> = {
  1: { desc: 'Separate hard lumps', group: 'Constipated' },
  2: { desc: 'Lumpy, sausage-shaped', group: 'Constipated' },
  3: { desc: 'Sausage with cracks', group: 'Normal' },
  4: { desc: 'Smooth, soft sausage', group: 'Normal' },
  5: { desc: 'Soft blobs, clear edges', group: 'Low fiber' },
  6: { desc: 'Mushy, ragged edges', group: 'Loose' },
  7: { desc: 'Watery, no solid pieces', group: 'Loose' },
};
