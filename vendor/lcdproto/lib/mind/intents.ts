/**
 * The high-level intent interface.
 *
 * This is the only door a future phone or cloud model gets. It may ask for an
 * intent; it may never send animation data, poses, or timing. Everything the
 * device performs is still authored locally, which is what keeps the character
 * consistent whether or not there is a network.
 */

import type { MindIntent, StoryCategory } from "./types";

export interface IntentMapping {
  /** Categories to draw from, in preference order. */
  categories: readonly StoryCategory[];
  /** Story ids tried first when they are off cooldown. */
  preferred: readonly string[];
  /** Temporary drive nudges so the mood matches the request. */
  drives: Partial<Record<string, number>>;
  /** How long the request stays influential. */
  holdMs: number;
}

export const INTENT_MAP: Record<MindIntent, IntentMapping> = {
  CHEER_USER_UP: {
    categories: ["HAPPY", "PLAYFUL", "AFFECTIONATE"],
    preferred: ["HAPPY_TINY_HOP", "PLAYFUL_OVERSHOOT_PROUD", "AFFECTION_COME_SIT"],
    drives: { playfulness: 0.85, affection: 0.8, boredom: 0.1, sleepiness: 0.1 },
    holdMs: 20_000,
  },
  CELEBRATE: {
    categories: ["HAPPY", "PLAYFUL"],
    preferred: ["HAPPY_PROUD_PUFF", "PLAYFUL_OVERSHOOT_PROUD", "HAPPY_BIG_HOP"],
    drives: { playfulness: 0.95, energy: 0.9, confidence: 0.85 },
    holdMs: 16_000,
  },
  WELCOME_USER: {
    categories: ["INTERACTION", "AFFECTIONATE", "HAPPY"],
    preferred: ["USER_RETURNED_GREETING", "AFFECTION_SOFT_EYES_SETTLE"],
    drives: { affection: 0.9, playfulness: 0.75, attentionNeed: 0.2, boredom: 0.05 },
    holdMs: 18_000,
  },
  ACT_CURIOUS: {
    categories: ["CURIOUS"],
    preferred: ["CURIOUS_DOUBLE_TAKE", "CURIOUS_LEAN_CLOSER", "CURIOUS_TILT_CHAIN"],
    drives: { curiosity: 0.95, boredom: 0.15 },
    holdMs: 22_000,
  },
  CALM_DOWN: {
    categories: ["IDLE", "SLEEPY"],
    preferred: ["IDLE_SOFT_BREATH", "IDLE_SOFT_SIGH", "SLEEPY_SETTLE_LOW"],
    drives: { energy: 0.3, playfulness: 0.2, startle: 0, patience: 0.9 },
    holdMs: 26_000,
  },
  SHOW_SLEEPY: {
    categories: ["SLEEPY"],
    preferred: ["SLEEPY_YAWN", "SLEEPY_SLOW_MELT", "SLEEPY_LONG_BLINK"],
    drives: { sleepiness: 0.9, energy: 0.2 },
    holdMs: 30_000,
  },
  REACT_TO_MESSAGE: {
    categories: ["CURIOUS", "SURPRISED", "HAPPY"],
    preferred: ["CURIOUS_NEW_THING", "STARTLE_POP_UP"],
    drives: { curiosity: 0.9, boredom: 0.1, energy: 0.7 },
    holdMs: 12_000,
  },
  GET_EXCITED: {
    categories: ["HAPPY", "PLAYFUL"],
    preferred: ["HAPPY_EXCITED_WIGGLE", "PLAYFUL_ANTICIPATION_BOUNCE"],
    drives: { energy: 0.95, playfulness: 0.9, sleepiness: 0.05 },
    holdMs: 16_000,
  },
  SHOW_AFFECTION: {
    categories: ["AFFECTIONATE", "SHY"],
    preferred: ["AFFECTION_SOFT_EYES_SETTLE", "SHY_LEAN_THEN_RETREAT"],
    drives: { affection: 0.95, social: 0.9 },
    holdMs: 24_000,
  },
  NOTICE_FRIEND: {
    categories: ["CURIOUS", "HAPPY", "INTERACTION"],
    preferred: ["CURIOUS_NEW_THING", "USER_RETURNED_GREETING"],
    drives: { curiosity: 0.9, affection: 0.8, playfulness: 0.7 },
    holdMs: 18_000,
  },
};
