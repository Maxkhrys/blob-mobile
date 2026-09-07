/**
 * Cherri's traits. These do not move at runtime — they are who he is, and they
 * only bias which stories score well. Everything that changes lives in Drives.
 */

import type { Personality } from "./types";

export const CHERRI_PERSONALITY: Personality = {
  curiosity: 0.82,
  playfulness: 0.76,
  affection: 0.68,
  confidence: 0.58,
  patience: 0.65,
  mischief: 0.45,
  sensitivity: 0.62,
};

/** Alternate profiles, used by the long-run tests and the Mind Lab. */
export const PERSONALITY_PROFILES: Record<string, Personality> = {
  CHERRI: CHERRI_PERSONALITY,
  BOLD: { ...CHERRI_PERSONALITY, confidence: 0.86, mischief: 0.72, sensitivity: 0.4 },
  SHY: { ...CHERRI_PERSONALITY, confidence: 0.3, mischief: 0.2, sensitivity: 0.85 },
  CALM: { ...CHERRI_PERSONALITY, playfulness: 0.42, patience: 0.9, curiosity: 0.6 },
};

export const personalityFromProfile = (name: string): Personality =>
  PERSONALITY_PROFILES[name] ?? CHERRI_PERSONALITY;
