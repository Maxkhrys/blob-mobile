/**
 * Parametric body phrases.
 *
 * These exist so the mind can author new acting ideas without anyone editing a
 * switch statement in the controller. Each primitive is a pure function of
 * normalised time, an amplitude, and a direction — no state, no allocation
 * beyond the single frame object the caller owns.
 *
 * They compose additively on top of whatever the existing behaviour cues are
 * already doing, which is why every value is a delta and every primitive
 * returns to zero at t = 1.
 */

import type { PrimitiveId } from "../mind/types";

/** Additive deltas, in the same units the controller's targets use. */
export interface BodyFrame {
  /** Whole-character travel offset, screen pixels. */
  x: number;
  y: number;
  rotation: number;
  scaleY: number;
  /** Whole-character scale delta, for puff and shrink. */
  scale: number;
  /** Body-surface mass deltas. */
  massX: number;
  massY: number;
  massRotation: number;
  massScaleY: number;
  skewX: number;
  skewY: number;
}

export const ZERO_FRAME: BodyFrame = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleY: 0,
  scale: 0,
  massX: 0,
  massY: 0,
  massRotation: 0,
  massScaleY: 0,
  skewX: 0,
  skewY: 0,
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** One rise-and-fall arc across the whole primitive. */
const arc = (t: number) => Math.sin(clamp01(t) * Math.PI);
/** A damped oscillation that always ends at rest. */
const ring = (t: number, cycles: number) =>
  Math.sin(clamp01(t) * Math.PI * 2 * cycles) * (1 - clamp01(t)) ** 1.4;

export interface PrimitiveMeta {
  id: PrimitiveId;
  durationMs: number;
  note: string;
}

export const PRIMITIVES: Record<PrimitiveId, PrimitiveMeta> = {
  HOP: { id: "HOP", durationMs: 900, note: "Crouch, launch, land, absorb." },
  DOUBLE_HOP: { id: "DOUBLE_HOP", durationMs: 1500, note: "Two hops, the second smaller." },
  LEAN: { id: "LEAN", durationMs: 1100, note: "Weight shifts and holds, then returns." },
  PEEK: { id: "PEEK", durationMs: 1200, note: "Leans out sideways as if past an edge." },
  SHRINK: { id: "SHRINK", durationMs: 950, note: "Becomes smaller and lower." },
  PUFF: { id: "PUFF", durationMs: 1000, note: "Inflates and holds before releasing." },
  WOBBLE: { id: "WOBBLE", durationMs: 1200, note: "Damped side-to-side after an impact." },
  SHIVER: { id: "SHIVER", durationMs: 850, note: "Fast small tremor." },
  NOD: { id: "NOD", durationMs: 900, note: "Whole body dips forward and back." },
  TILT: { id: "TILT", durationMs: 1000, note: "Rolls onto one side and holds." },
  DASH: { id: "DASH", durationMs: 800, note: "Quick travel with a lag and an overshoot." },
  RECOIL: { id: "RECOIL", durationMs: 700, note: "Sharp retreat, then a spring back." },
  BREATHE: { id: "BREATHE", durationMs: 1800, note: "One slow full breath." },
  SETTLE: { id: "SETTLE", durationMs: 900, note: "Mass drops and comes to rest." },
  SWAY: { id: "SWAY", durationMs: 1400, note: "A slow lean across and back." },
  STUMBLE: { id: "STUMBLE", durationMs: 1000, note: "Overbalance, catch, correct." },
  SHAKE_OFF: { id: "SHAKE_OFF", durationMs: 900, note: "Rapid shake that resets the shape." },
  BALANCE: { id: "BALANCE", durationMs: 1400, note: "Narrow base, hunting for balance." },
  SNEEZE: { id: "SNEEZE", durationMs: 800, note: "Wind up, sharp release, small recoil." },
  HICCUP: { id: "HICCUP", durationMs: 600, note: "One sharp involuntary jolt." },
  SLUMP: { id: "SLUMP", durationMs: 1300, note: "Sinks and spreads." },
  STRETCH_UP: { id: "STRETCH_UP", durationMs: 1100, note: "Rises tall and comes back." },
  SQUISH: { id: "SQUISH", durationMs: 850, note: "Compresses down and wide." },
  PULSE: { id: "PULSE", durationMs: 1200, note: "Three soft volume pulses." },
  INFLATE: { id: "INFLATE", durationMs: 2400, note: "Giant proud puff that holds, then releases." },
  FLATTEN: { id: "FLATTEN", durationMs: 2400, note: "Pancake squash that holds a readable silhouette." },
  GIGGLE: { id: "GIGGLE", durationMs: 1100, note: "Four small laugh-squishes that settle." },
};

/**
 * Samples one primitive.
 *
 * @param t      normalised time, 0..1
 * @param amount amplitude multiplier, typically 0.3..1.2
 * @param dir    -1 left, +1 right, 0 for symmetric primitives
 */
export function samplePrimitive(
  id: PrimitiveId,
  t: number,
  amount: number,
  dir: number,
  out: BodyFrame
): BodyFrame {
  out.x = 0;
  out.y = 0;
  out.rotation = 0;
  out.scaleY = 0;
  out.scale = 0;
  out.massX = 0;
  out.massY = 0;
  out.massRotation = 0;
  out.massScaleY = 0;
  out.skewX = 0;
  out.skewY = 0;

  const a = amount;
  const p = clamp01(t);
  const d = dir === 0 ? 1 : dir;

  switch (id) {
    case "HOP": {
      // Anticipation crouch, then the launch, then an absorbing landing.
      if (p < 0.2) {
        const k = smooth(p / 0.2);
        out.y = 8 * k * a;
        out.scaleY = -0.12 * k * a;
      } else if (p < 0.6) {
        const k = smooth((p - 0.2) / 0.4);
        out.y = (8 - 36 * k) * a;
        out.scaleY = (-0.12 + 0.22 * k) * a;
      } else {
        const k = smooth((p - 0.6) / 0.4);
        out.y = (-28 + 28 * k) * a + 6 * arc((p - 0.6) / 0.4) * a;
        out.scaleY = (0.1 - 0.2 * k) * a;
        out.massY = 3.6 * arc((p - 0.6) / 0.4) * a;
      }
      break;
    }
    case "DOUBLE_HOP": {
      const first = samplePhase(p, 0, 0.55);
      const second = samplePhase(p, 0.55, 1);
      if (first >= 0) {
        out.y = -20 * arc(first) * a;
        out.scaleY = 0.09 * arc(first) * a;
      } else if (second >= 0) {
        out.y = -12 * arc(second) * a;
        out.scaleY = 0.06 * arc(second) * a;
      }
      out.massY = -out.y * 0.16;
      break;
    }
    case "LEAN": {
      const hold = plateau(p, 0.22, 0.72);
      out.x = 6.5 * d * hold * a;
      out.rotation = 2.2 * d * hold * a;
      out.massX = 3.4 * d * hold * a;
      out.massRotation = 2.6 * d * hold * a;
      out.skewY = 1.8 * d * hold * a;
      break;
    }
    case "PEEK": {
      const hold = plateau(p, 0.18, 0.7);
      out.x = 11 * d * hold * a;
      out.rotation = 3.4 * d * hold * a;
      out.massX = 4.2 * d * hold * a;
      out.skewX = -1.6 * d * hold * a;
      out.massScaleY = -0.03 * hold * a;
      break;
    }
    case "SHRINK": {
      const hold = plateau(p, 0.16, 0.72);
      out.scale = -0.38 * hold * a;
      out.y = 8 * hold * a;
      out.massY = 4.2 * hold * a;
      out.massScaleY = -0.16 * hold * a;
      out.scaleY = -0.08 * hold * a;
      break;
    }
    case "PUFF": {
      const hold = plateau(p, 0.14, 0.7);
      out.scale = 0.2 * hold * a;
      out.y = -5.2 * hold * a;
      out.massScaleY = 0.1 * hold * a;
      out.scaleY = 0.06 * hold * a;
      break;
    }
    case "WOBBLE": {
      out.x = 6 * ring(p, 2.2) * a;
      out.rotation = 3.2 * ring(p, 2.2) * a;
      out.massX = 3.6 * ring(p, 2.6) * a;
      out.skewY = 2.4 * ring(p, 2.4) * a;
      break;
    }
    case "SHIVER": {
      out.x = 2.4 * ring(p, 6) * a;
      out.massX = 1.9 * ring(p, 7) * a;
      out.rotation = 1.1 * ring(p, 6) * a;
      break;
    }
    case "NOD": {
      out.y = 7 * arc(p) * a;
      out.scaleY = -0.05 * arc(p) * a;
      out.massY = 3.4 * arc(p) * a;
      out.massRotation = 1.4 * arc(p) * a * d;
      break;
    }
    case "TILT": {
      const hold = plateau(p, 0.2, 0.7);
      out.rotation = 6.5 * d * hold * a;
      out.massRotation = 4.4 * d * hold * a;
      out.skewX = -2.2 * d * hold * a;
      break;
    }
    case "DASH": {
      const k = p < 0.35 ? smooth(p / 0.35) : 1;
      const back = p > 0.55 ? smooth((p - 0.55) / 0.45) : 0;
      const travel = (k - back) * a;
      out.x = 15 * d * travel;
      out.rotation = 4.2 * d * travel;
      out.massX = -5.5 * d * travel;
      out.skewY = 3.2 * d * travel;
      out.scaleY = -0.03 * travel;
      break;
    }
    case "RECOIL": {
      const hit = p < 0.25 ? smooth(p / 0.25) : 1 - smooth((p - 0.25) / 0.75);
      out.x = -9 * d * hit * a;
      out.y = -3 * hit * a;
      out.rotation = -3.4 * d * hit * a;
      out.scaleY = 0.05 * hit * a;
      out.massX = -4.6 * d * hit * a;
      out.massScaleY = 0.04 * hit * a;
      break;
    }
    case "BREATHE": {
      const s = arc(p);
      out.scaleY = 0.028 * s * a;
      out.y = -1.6 * s * a;
      out.massScaleY = 0.018 * s * a;
      break;
    }
    case "SETTLE": {
      const fall = smooth(p);
      const bounce = ring(p, 1.4) * 0.4;
      out.y = (3.6 * (1 - fall) + 2.2 * bounce) * a;
      out.scaleY = -0.035 * (1 - fall) * a;
      out.massY = 2 * (1 - fall) * a;
      out.massScaleY = -0.028 * (1 - fall) * a;
      break;
    }
    case "SWAY": {
      const s = Math.sin(p * Math.PI * 2) * (1 - p * 0.35);
      out.x = 7.5 * d * s * a;
      out.rotation = 2.4 * d * s * a;
      out.massX = 3.2 * d * s * a;
      out.skewY = 1.6 * d * s * a;
      break;
    }
    case "STUMBLE": {
      const over = p < 0.4 ? smooth(p / 0.4) : 1 - smooth((p - 0.4) / 0.6);
      out.x = 10 * d * over * a;
      out.rotation = 7 * d * over * a - 3 * d * ring(p, 1.6) * a;
      out.massX = 4.8 * d * over * a;
      out.scaleY = -0.04 * over * a;
      out.skewX = 2.6 * d * over * a;
      break;
    }
    case "SHAKE_OFF": {
      out.x = 4.2 * ring(p, 4.5) * a;
      out.rotation = 4.6 * ring(p, 4.5) * a;
      out.massX = 3.4 * ring(p, 5) * a;
      out.massScaleY = 0.03 * ring(p, 3) * a;
      out.skewY = 2.8 * ring(p, 4) * a;
      break;
    }
    case "BALANCE": {
      const hold = plateau(p, 0.18, 0.72);
      out.y = -4 * hold * a;
      out.scaleY = 0.055 * hold * a;
      out.rotation = 3.6 * Math.sin(p * Math.PI * 5) * hold * a;
      out.massRotation = -2.4 * Math.sin(p * Math.PI * 5) * hold * a;
      break;
    }
    case "SNEEZE": {
      if (p < 0.45) {
        const k = smooth(p / 0.45);
        out.y = -4.5 * k * a;
        out.scaleY = 0.05 * k * a;
      } else {
        const k = smooth((p - 0.45) / 0.55);
        out.y = (-4.5 + 12 * k) * a * (1 - k * 0.6);
        out.scaleY = (0.05 - 0.14 * k) * a * (1 - k * 0.5);
        out.massY = 4.4 * arc((p - 0.45) / 0.55) * a;
      }
      break;
    }
    case "HICCUP": {
      const jolt = arc(p) ** 3;
      out.y = -8 * jolt * a;
      out.scaleY = 0.07 * jolt * a;
      out.massY = -3 * jolt * a;
      break;
    }
    case "SLUMP": {
      const fall = smooth(p < 0.7 ? p / 0.7 : 1);
      out.y = 6.5 * fall * a;
      out.scaleY = -0.075 * fall * a;
      out.massY = 3.6 * fall * a;
      out.massScaleY = -0.05 * fall * a;
      break;
    }
    case "STRETCH_UP": {
      const hold = plateau(p, 0.18, 0.72);
      out.y = -14 * hold * a;
      out.scaleY = 0.24 * hold * a;
      out.massY = -4.8 * hold * a;
      out.massScaleY = 0.12 * hold * a;
      out.scale = 0.04 * hold * a;
      break;
    }
    case "SQUISH": {
      const hold = plateau(p, 0.14, 0.64);
      out.y = 10 * hold * a;
      out.scaleY = -0.2 * hold * a;
      out.massY = 5.2 * hold * a;
      out.massScaleY = -0.12 * hold * a;
      break;
    }
    case "PULSE": {
      const s = Math.sin(p * Math.PI * 6) * (1 - p);
      out.scaleY = 0.038 * s * a;
      out.scale = 0.022 * s * a;
      out.massScaleY = 0.028 * s * a;
      break;
    }
    case "INFLATE": {
      const hold = plateau(p, 0.14, 0.78);
      out.scale = 0.38 * hold * a;
      out.y = -10 * hold * a;
      out.massScaleY = 0.16 * hold * a;
      out.scaleY = 0.1 * hold * a;
      break;
    }
    case "FLATTEN": {
      const hold = plateau(p, 0.12, 0.76);
      out.y = 18 * hold * a;
      out.scaleY = -0.42 * hold * a;
      out.massY = 8 * hold * a;
      out.massScaleY = -0.24 * hold * a;
      out.scale = -0.08 * hold * a;
      break;
    }
    case "GIGGLE": {
      const s = Math.sin(p * Math.PI * 8) * (1 - p * 0.45);
      out.scaleY = -0.14 * Math.abs(s) * a;
      out.y = 6.4 * Math.abs(s) * a;
      out.massScaleY = -0.08 * Math.abs(s) * a;
      out.scale = 0.05 * Math.abs(s) * a;
      break;
    }
    default:
      break;
  }
  return out;
}

/** Rises in, holds, releases — the shape most "pose and hold" beats want. */
function plateau(t: number, rise: number, fall: number): number {
  if (t < rise) return smooth(t / rise);
  if (t < fall) return 1;
  return 1 - smooth((t - fall) / (1 - fall));
}

/** Maps a sub-range of the primitive onto 0..1, or -1 when outside it. */
function samplePhase(t: number, from: number, to: number): number {
  if (t < from || t > to) return -1;
  return (t - from) / (to - from);
}
