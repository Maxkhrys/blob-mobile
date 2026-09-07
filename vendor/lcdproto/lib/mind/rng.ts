/**
 * One seeded generator for the whole mind. Everything stochastic goes through
 * here, so a seed plus an event sequence reproduces a run exactly. mulberry32
 * is 32-bit integer maths only: it ports to the ESP32 unchanged.
 */
export class SeededRandom {
  private state: number;

  constructor(public readonly seed: number) {
    this.state = seed >>> 0;
  }

  reset(seed = this.seed) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inclusive of min, exclusive of max. */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(maxExclusive: number): number {
    return Math.min(maxExclusive - 1, Math.floor(this.next() * maxExclusive));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** -1 or +1. Used wherever a story could plausibly go either way. */
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}

export const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export const clamp01 = (value: number) => clamp(value, 0, 1);

/** Frame-rate independent approach toward a target. */
export const approach = (
  value: number,
  target: number,
  rateHz: number,
  dtMs: number
) => value + (target - value) * (1 - Math.exp(-rateHz * (dtMs / 1000)));
