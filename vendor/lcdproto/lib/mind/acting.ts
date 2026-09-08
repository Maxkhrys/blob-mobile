/**
 * Cherri Mind V4.5 — acting-cycle presets, intensity, and director pacing.
 *
 * This is not a second scheduler. CherriMind remains the only director; these
 * tables only reweight, retarget, and time the catalogue it already owns.
 * Every number is a scalar so the same tables port to an ESP32-S3.
 */

import type { ActingCycle, ActingIntensity, StoryCategory } from "./types";

export type { ActingCycle, ActingIntensity };

export const ACTING_CYCLES: readonly ActingCycle[] = [
  "NATURAL",
  "CUTE",
  "FUNNY",
  "HYPER",
  "SLEEPY",
  "MISCHIEF",
  "SHOWCASE",
] as const;

export const ACTING_INTENSITIES: readonly ActingIntensity[] = [
  "SUBTLE",
  "NORMAL",
  "EXPRESSIVE",
] as const;

export const DEFAULT_ACTING_CYCLE: ActingCycle = "NATURAL";
export const DEFAULT_ACTING_INTENSITY: ActingIntensity = "EXPRESSIVE";

/** Three pacing tiers the director consults on every decision. */
export interface IntensityScale {
  /** Multiplier on the quiet gap between real thoughts. */
  quiet: number;
  /** Micro-life interval range, milliseconds. */
  microMin: number;
  microMax: number;
  /** Signature cadence range, milliseconds. */
  signatureMin: number;
  signatureMax: number;
  /** Gaze / posture / primitive amplitude. */
  amplitude: number;
  /** Extra peak-hold on expressions and mouths, milliseconds. */
  peakHold: number;
}

export const INTENSITY_SCALE: Record<ActingIntensity, IntensityScale> = {
  SUBTLE: {
    quiet: 1.15,
    microMin: 4_200,
    microMax: 8_500,
    signatureMin: 28_000,
    signatureMax: 48_000,
    amplitude: 0.72,
    peakHold: 90,
  },
  NORMAL: {
    quiet: 0.85,
    microMin: 3_000,
    microMax: 6_800,
    signatureMin: 18_000,
    signatureMax: 36_000,
    amplitude: 0.92,
    peakHold: 140,
  },
  EXPRESSIVE: {
    quiet: 0.55,
    microMin: 2_400,
    microMax: 5_600,
    signatureMin: 12_000,
    signatureMax: 28_000,
    amplitude: 1.12,
    peakHold: 220,
  },
};

/** Extra quiet-gap multiplier per acting cycle, stacked on intensity. */
export const CYCLE_QUIET: Record<ActingCycle, number> = {
  NATURAL: 1,
  CUTE: 0.92,
  FUNNY: 0.78,
  HYPER: 0.48,
  SLEEPY: 1.55,
  MISCHIEF: 0.82,
  SHOWCASE: 0.42,
};

/**
 * Category bias per cycle. NATURAL is even; others pull the director toward
 * a readable personality without forbidding the rest of the catalogue.
 */
export const CYCLE_CATEGORY_WEIGHT: Record<ActingCycle, Partial<Record<StoryCategory, number>>> = {
  NATURAL: {
    IDLE: 1.05,
    CURIOUS: 1.1,
    HAPPY: 1.05,
    PLAYFUL: 1,
    SHY: 0.9,
    AFFECTIONATE: 0.95,
    SLEEPY: 0.75,
    MISCHIEF: 0.95,
    SURPRISED: 0.85,
    ANNOYED: 0.7,
    RARE: 1.15,
  },
  CUTE: {
    IDLE: 0.85,
    HAPPY: 1.35,
    AFFECTIONATE: 1.45,
    SHY: 1.3,
    PLAYFUL: 1.15,
    MISCHIEF: 0.7,
    ANNOYED: 0.25,
    SLEEPY: 0.7,
    SURPRISED: 0.9,
    RARE: 1.1,
  },
  FUNNY: {
    PLAYFUL: 1.4,
    MISCHIEF: 1.35,
    HAPPY: 1.2,
    SURPRISED: 1.25,
    RARE: 1.55,
    SLEEPY: 0.45,
    SHY: 0.8,
    ANNOYED: 0.55,
    IDLE: 0.7,
  },
  HYPER: {
    HAPPY: 1.45,
    PLAYFUL: 1.5,
    SURPRISED: 1.2,
    MISCHIEF: 1.15,
    SLEEPY: 0.15,
    IDLE: 0.45,
    SHY: 0.4,
    RARE: 1.2,
  },
  SLEEPY: {
    SLEEPY: 2.1,
    IDLE: 1.4,
    AFFECTIONATE: 0.9,
    HAPPY: 0.4,
    PLAYFUL: 0.25,
    MISCHIEF: 0.2,
    SURPRISED: 0.35,
    RARE: 0.7,
    ANNOYED: 0.3,
  },
  MISCHIEF: {
    MISCHIEF: 1.7,
    PLAYFUL: 1.3,
    ANNOYED: 1.05,
    SURPRISED: 1.1,
    HAPPY: 0.9,
    SHY: 0.55,
    SLEEPY: 0.3,
    RARE: 1.35,
    AFFECTIONATE: 0.6,
  },
  SHOWCASE: {
    HAPPY: 1.2,
    PLAYFUL: 1.2,
    MISCHIEF: 1.2,
    SURPRISED: 1.2,
    RARE: 1.4,
    IDLE: 0.5,
  },
};

/** Stories Cherri may open with in the first ~8 seconds so personality lands immediately. */
export const OPENING_POOL: readonly string[] = [
  "SIG_CAUGHT_YOU_LOOKING",
  "SIG_BLEP_INNOCENT",
  "SIG_GIANT_PROUD_PUFF",
  "SIG_TONGUE_PEEK",
  "HAPPY_TINY_HOP",
  "SIG_SMUG_SIDE_EYE",
];

/**
 * Deterministic 60s showcase. Quiet gaps live in the director, not as empty
 * beats, so the body can still breathe between clip-worthy moments.
 */
export const SHOWCASE_SEQUENCE: readonly string[] = [
  "SIG_CAUGHT_YOU_LOOKING",
  "SIG_BLEP_INNOCENT",
  "SIG_FAILED_WINK",
  "SIG_GIANT_PROUD_PUFF",
  "SIG_FAKE_SNEEZE",
  "SIG_SNEEZE_THAT_DOESNT_HAPPEN",
  "SIG_HAPPY_SILENT_LAUGH",
  "SIG_RASPBERRY",
  "SIG_PANCAKE",
  "SIG_DANCE_CAUGHT",
  "SIG_SMUG_SIDE_EYE",
];

export const CYCLE_OPENING: Record<ActingCycle, readonly string[]> = {
  NATURAL: OPENING_POOL,
  CUTE: ["SIG_BLEP_INNOCENT", "SIG_CAUGHT_YOU_LOOKING", "SIG_PEA_SHRINK", "SIG_TONGUE_PEEK"],
  FUNNY: ["SIG_FAILED_WINK", "SIG_RASPBERRY", "SIG_HICCUP", "SIG_FAKE_SNEEZE"],
  HYPER: ["SIG_SURPRISE_POP", "SIG_GIANT_PROUD_PUFF", "HAPPY_TINY_HOP"],
  SLEEPY: ["SIG_TALL_STRETCH", "SIG_ALMOST_ASLEEP_FALL", "SLEEPY_LONG_BLINK"],
  MISCHIEF: ["SIG_RASPBERRY", "SIG_SMUG_SIDE_EYE", "SIG_BLEP_INNOCENT"],
  SHOWCASE: SHOWCASE_SEQUENCE,
};

export const CYCLE_PREFERRED_TAGS: Record<ActingCycle, readonly string[]> = {
  NATURAL: ["opening", "showcase", "cute"],
  CUTE: ["cute", "opening", "tongue", "shy"],
  FUNNY: ["funny", "showcase"],
  HYPER: ["hyper", "funny"],
  SLEEPY: ["sleepy"],
  MISCHIEF: ["mischief", "tongue", "funny"],
  SHOWCASE: ["showcase"],
};

/** Immediate readable beat when a lab mood is forced. */
export const MOOD_OPENERS: Record<string, string> = {
  IDLE: "SIG_TALL_STRETCH",
  BORED: "SIG_PANCAKE",
  PLAYFUL: "SIG_BLEP_INNOCENT",
  SLEEPY: "SLEEPY_LONG_BLINK",
  SHY: "SIG_PEA_SHRINK",
  AFFECTIONATE: "SIG_CAUGHT_YOU_LOOKING",
  STARTLED: "SIG_SURPRISE_POP",
  ANNOYED: "SIG_SMUG_SIDE_EYE",
  CURIOUS: "SIG_TONGUE_PEEK",
  MISCHIEF: "SIG_RASPBERRY",
};

export const CYCLE_EPISODE: Partial<Record<ActingCycle, string>> = {
  CUTE: "AFFECTIONATE",
  FUNNY: "PLAYFUL",
  HYPER: "PLAYFUL",
  SLEEPY: "SLEEPY",
  MISCHIEF: "MISCHIEF",
};

export const cycleWeight = (cycle: ActingCycle, category: StoryCategory): number =>
  CYCLE_CATEGORY_WEIGHT[cycle][category] ?? 1;

export const intensityOf = (intensity: ActingIntensity): IntensityScale =>
  INTENSITY_SCALE[intensity];

export function cycleTagBoost(cycle: ActingCycle, tags: readonly string[] | undefined): number {
  if (!tags || tags.length === 0) return 1;
  const preferred = CYCLE_PREFERRED_TAGS[cycle];
  for (let i = 0; i < tags.length; i += 1) {
    if (preferred.includes(tags[i])) return cycle === "NATURAL" ? 1.28 : 1.9;
  }
  return cycle === "NATURAL" ? 1 : 0.82;
}
