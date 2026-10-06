export interface Row<T> { item: T; start: number; end: number }
export interface Block<T> extends Row<T> { lane: number; lanes: number }
export interface Overflow { at: number; count: number }

/**
 * Lays out one column. Overlapping rows share the width (up to maxLanes);
 * rows that do not fit are counted in an overflow chip anchored at the first hidden row.
 * minMs is the minimum visual duration, so short entries still reserve space.
 */
export function layoutColumn<T>(rows: Row<T>[], minMs: number, maxLanes = 2) {
  const blocks: Block<T>[] = [];
  const overflow: Overflow[] = [];
  let cluster: Block<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  let hiddenAt = 0;
  let hiddenCount = 0;

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    cluster.forEach((b) => (b.lanes = lanes));
    blocks.push(...cluster);
    if (hiddenCount) overflow.push({ at: hiddenAt, count: hiddenCount });
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
    hiddenCount = 0;
  };

  for (const r of [...rows].sort((a, b) => a.start - b.start)) {
    const end = Math.max(r.end, r.start + minMs);
    if (r.start >= clusterEnd) flush();
    clusterEnd = Math.max(clusterEnd, end);

    let lane = laneEnds.findIndex((e) => e <= r.start);
    if (lane === -1 && laneEnds.length < maxLanes) lane = laneEnds.length;
    if (lane === -1) {
      if (!hiddenCount) hiddenAt = r.start;
      hiddenCount++;
      continue;
    }
    laneEnds[lane] = end;
    cluster.push({ item: r.item, start: r.start, end, lane, lanes: 1 });
  }
  flush();
  return { blocks, overflow };
}
