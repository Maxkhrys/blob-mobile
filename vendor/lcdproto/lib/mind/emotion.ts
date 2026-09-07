/**
 * Emotion is derived, not stored. Four dimensions fall out of the drives each
 * decision tick, and the legacy named mood is read back out of those
 * dimensions so the existing renderer keeps working unchanged.
 */

import type { HomeMood } from "../behaviours/types";
import { clamp, clamp01 } from "./rng";
import type { Drives, Emotion, Personality } from "./types";

export const NEUTRAL_EMOTION: Emotion = {
  valence: 0.2,
  arousal: 0.4,
  confidence: 0.58,
  social: 0.5,
};

/**
 * Derives the emotional dimensions from the current drives. Kept as plain
 * arithmetic on eleven scalars: no tables, no branches worth profiling.
 */
export function deriveEmotion(
  drives: Drives,
  personality: Personality,
  into: Emotion = { ...NEUTRAL_EMOTION }
): Emotion {
  const pleasure =
    drives.playfulness * 0.34 +
    drives.affection * 0.3 +
    drives.curiosity * 0.14 +
    drives.energy * 0.12;
  const displeasure =
    drives.startle * 0.34 +
    (1 - drives.patience) * 0.3 +
    drives.boredom * 0.22 +
    drives.attentionNeed * 0.14;
  into.valence = clamp(pleasure * 1.55 - displeasure * 1.35, -1, 1);

  into.arousal = clamp01(
    drives.energy * 0.38 +
      drives.playfulness * 0.24 +
      drives.startle * 0.3 +
      drives.curiosity * 0.16 -
      drives.sleepiness * 0.62
  );

  into.confidence = clamp01(
    drives.confidence * 0.68 +
      personality.confidence * 0.2 -
      drives.startle * 0.3 +
      drives.mischief * 0.12
  );

  into.social = clamp01(
    drives.affection * 0.52 +
      drives.attentionNeed * 0.24 +
      personality.affection * 0.2 -
      drives.sleepiness * 0.18
  );

  return into;
}

/**
 * The named mood the renderer still consumes. It emerges from the dimensions
 * rather than being the source of truth.
 */
export function moodFromEmotion(emotion: Emotion, drives: Drives): HomeMood {
  if (emotion.arousal < 0.24 || drives.sleepiness > 0.68) return "SLEEPY";
  if (emotion.valence < -0.18 && emotion.arousal > 0.35) return "DISTRACTED";
  if (drives.curiosity > 0.72 && emotion.arousal > 0.35) return "CURIOUS";
  if (emotion.valence > 0.34 && emotion.arousal > 0.52) return "AMUSED";
  if (emotion.arousal < 0.42 && drives.boredom < 0.45) return "THOUGHTFUL";
  return "CONTENT";
}

/** Short human label for telemetry. Not used for any decision. */
export function emotionLabel(emotion: Emotion, drives: Drives): string {
  if (drives.startle > 0.45) return "startled";
  if (emotion.arousal < 0.24) return "sleepy";
  if (emotion.valence > 0.4 && emotion.confidence < 0.4) return "shy-happy";
  if (emotion.valence > 0.4) return "happy";
  if (emotion.valence < -0.2) return "annoyed";
  if (drives.curiosity > 0.72) return "curious";
  if (drives.boredom > 0.6) return "bored";
  return "content";
}

/** Distance from a story's preferred emotional neighbourhood, 0 = perfect. */
export function emotionDistance(
  emotion: Emotion,
  want: Partial<Emotion> | undefined
): number {
  if (!want) return 0;
  let total = 0;
  let count = 0;
  if (want.valence !== undefined) {
    total += Math.abs(emotion.valence - want.valence) * 0.5;
    count += 1;
  }
  if (want.arousal !== undefined) {
    total += Math.abs(emotion.arousal - want.arousal);
    count += 1;
  }
  if (want.confidence !== undefined) {
    total += Math.abs(emotion.confidence - want.confidence);
    count += 1;
  }
  if (want.social !== undefined) {
    total += Math.abs(emotion.social - want.social);
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

/** Mood presets the Mind Lab pushes straight into the drives. */
export const MOOD_FORCE: Record<
  string,
  Partial<Drives>
> = {
  MISCHIEF: { mischief: 0.94, playfulness: 0.72, energy: 0.7, sleepiness: 0.1, patience: 0.6 },
  IDLE: { boredom: 0.3, energy: 0.6, sleepiness: 0.2, startle: 0, playfulness: 0.4 },
  BORED: { boredom: 0.92, playfulness: 0.25, curiosity: 0.35, energy: 0.4 },
  PLAYFUL: { playfulness: 0.94, energy: 0.86, boredom: 0.1, sleepiness: 0.05 },
  SLEEPY: { sleepiness: 0.9, energy: 0.2, playfulness: 0.15, curiosity: 0.2 },
  SHY: { confidence: 0.12, affection: 0.72, attentionNeed: 0.5, playfulness: 0.3 },
  AFFECTIONATE: { affection: 0.94, attentionNeed: 0.62, confidence: 0.5, boredom: 0.1 },
  STARTLED: { startle: 0.92, confidence: 0.2, energy: 0.75 },
  ANNOYED: { patience: 0.06, mischief: 0.7, playfulness: 0.4, boredom: 0.3 },
  CURIOUS: { curiosity: 0.95, boredom: 0.2, energy: 0.68 },
};
