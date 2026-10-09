/** Small seeded PRNG (mulberry32), so permutation results are repeatable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Benjamini-Hochberg adjusted p-values (q-values), returned in the input order. */
export function benjaminiHochberg(p: number[]): number[] {
  const m = p.length;
  const order = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const q = new Array<number>(m);
  let running = 1;
  for (let k = m - 1; k >= 0; k--) {
    running = Math.min(running, (order[k][0] * m) / (k + 1));
    q[order[k][1]] = running;
  }
  return q;
}
