/** PRNG mulberry32: estado de 32 bits serializable en el GameState. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Envoltorio mutable sobre el estado RNG de un objeto `{ rng }`. */
export function rngOf(holder: { rng: number }) {
  return {
    float(): number {
      const [v, s] = nextRandom(holder.rng);
      holder.rng = s;
      return v;
    },
    int(min: number, max: number): number {
      return min + Math.floor(this.float() * (max - min + 1));
    },
    shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.float() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}
