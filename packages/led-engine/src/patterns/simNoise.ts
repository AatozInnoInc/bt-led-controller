/**
 * Deterministic noise helpers for simulator-only patterns (no firmware parity claim).
 */

export function hash01(i: number): number {
  let x = Math.imul(i ^ 0xdeadbeef, 2246822519) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917) >>> 0;
  return x / 0x100000000;
}

/** Smooth interpolation between hashed lattice points (value noise). */
export function smoothNoise1(t: number): number {
  const ti = Math.floor(t);
  const f = t - ti;
  const a = hash01(ti);
  const b = hash01(ti + 1);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
