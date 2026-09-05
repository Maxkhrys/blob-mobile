/**
 * Canonical State Emotion & Personality Map
 * Synchronized with LCDPROTO: lib/stateEmotionMap.ts & lib/deviceStates.ts
 */

import { ProductState, ProductStateMeta, StateEmotionConfig } from "./types";

export const CANONICAL_PRODUCT_STATES: readonly ProductStateMeta[] = [
  {
    id: "HOME",
    label: "Home",
    accent: "#6D5BD0",
    description: "Autonomous peaceful resting",
  },
  {
    id: "SENSED",
    label: "Sensed",
    accent: "#5B6BD0",
    description: "Peripheral notice of companion",
  },
  {
    id: "APPROACHING",
    label: "Approaching",
    accent: "#4F86C6",
    description: "Closing distance vector",
  },
  {
    id: "VERY_CLOSE",
    label: "Very Close",
    accent: "#3FA9A0",
    description: "Immediate proximity contact",
  },
  {
    id: "TOGETHER",
    label: "Together",
    accent: "#54A86B",
    description: "Co-cruising side-by-side",
  },
  {
    id: "SYNC",
    label: "Sync",
    accent: "#B99A4F",
    description: "Harmonic breathing & movement",
  },
  {
    id: "CONNECTED",
    label: "Connected",
    accent: "#C4744F",
    description: "Unbroken emotional link",
  },
  {
    id: "RECOGNIZED",
    label: "Recognized",
    accent: "#B0587E",
    description: "Instant greeting of known friend",
  },
  {
    id: "GOODBYE",
    label: "Goodbye",
    accent: "#4F46E5",
    description: "Farewell and saved to memory",
  },
] as const;

export const STATE_EMOTION_MAP: Record<ProductState, StateEmotionConfig> = {
  HOME: {
    stateId: "HOME",
    label: "Home / Autonomous",
    expressionId: "NEUTRAL",
    performanceId: "JOY_HOP",
    description:
      "Living naturally in its environment, self-contained autonomy with ambient curiosity.",
    intimacyLevel: 0.1,
    bodyLean: 0,
    depthBias: 0,
    pupilDilation: 1.0,
  },
  SENSED: {
    stateId: "SENSED",
    label: "Sensed / Peripheral Notice",
    expressionId: "CURIOUS",
    performanceId: "CURIOUS_DOUBLE_TAKE",
    description:
      "First notice of presence at periphery. Alert double-take and focal lock.",
    intimacyLevel: 0.3,
    bodyLean: 2,
    depthBias: 0.1,
    pupilDilation: 1.15,
  },
  APPROACHING: {
    stateId: "APPROACHING",
    label: "Approaching / Tracking",
    expressionId: "CURIOUS",
    performanceId: "CURIOUS_DOUBLE_TAKE",
    description:
      "Friend is stepping closer. Eyes widen, head pitches forward, following motion.",
    intimacyLevel: 0.5,
    bodyLean: 5,
    depthBias: 0.25,
    pupilDilation: 1.2,
  },
  VERY_CLOSE: {
    stateId: "VERY_CLOSE",
    label: "Very Close / Anticipation",
    expressionId: "EXCITED",
    performanceId: "EXCITED_WIGGLE",
    description:
      "Friend is right at the glass. High emotional arousal and joyful anticipation.",
    intimacyLevel: 0.75,
    bodyLean: 8,
    depthBias: 0.45,
    pupilDilation: 1.3,
  },
  TOGETHER: {
    stateId: "TOGETHER",
    label: "Together / Shared Presence",
    expressionId: "HAPPY",
    performanceId: "LAUGH_SQUISH",
    description:
      "Both are settled together. Warm, content squishes and cozy soft smiles.",
    intimacyLevel: 0.85,
    bodyLean: 4,
    depthBias: 0.3,
    pupilDilation: 1.1,
  },
  SYNC: {
    stateId: "SYNC",
    label: "Sync / Co-Regulation",
    expressionId: "HAPPY",
    performanceId: "JOY_HOP",
    description:
      "Harmonic breathing and movement synchronization with the companion.",
    intimacyLevel: 0.92,
    bodyLean: 0,
    depthBias: 0.35,
    pupilDilation: 1.15,
  },
  CONNECTED: {
    stateId: "CONNECTED",
    label: "Connected / Deep Bond",
    expressionId: "HAPPY",
    performanceId: "LAUGH_SQUISH",
    description:
      "Unbroken emotional link. Radiant expressions, relaxed posture, affectionate micro-glances.",
    intimacyLevel: 0.98,
    bodyLean: 3,
    depthBias: 0.4,
    pupilDilation: 1.25,
  },
  RECOGNIZED: {
    stateId: "RECOGNIZED",
    label: "Recognized / Familiar Greeting",
    expressionId: "SURPRISED",
    performanceId: "SURPRISE_POP",
    description:
      "Instantaneous recognition spark! Surprised pop of joy upon confirming known companion.",
    intimacyLevel: 0.9,
    bodyLean: 6,
    depthBias: 0.5,
    pupilDilation: 1.35,
  },
  GOODBYE: {
    stateId: "GOODBYE",
    label: "Goodbye / Parting",
    expressionId: "HAPPY_SOFT",
    performanceId: "SAD_SETTLE",
    description:
      "Gentle parting glance, fading softly into memory while holding resting pose.",
    intimacyLevel: 0.2,
    bodyLean: -2,
    depthBias: -0.1,
    pupilDilation: 0.95,
  },
};

export function getStateEmotionConfig(state: ProductState): StateEmotionConfig {
  return STATE_EMOTION_MAP[state] ?? STATE_EMOTION_MAP.HOME;
}

export function getStateMeta(state: ProductState): ProductStateMeta {
  return (
    CANONICAL_PRODUCT_STATES.find((s) => s.id === state) ??
    CANONICAL_PRODUCT_STATES[0]
  );
}
