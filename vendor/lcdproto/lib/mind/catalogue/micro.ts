/**
 * Micro-life. These are the smallest thoughts Cherri has, and most of them
 * should never be consciously noticed — they exist so he is never frozen.
 *
 * Every micro story is short, low amplitude, and cheap to interrupt. They run
 * in the gaps between real performances, and the director throttles them so
 * the screen never reads as constant twitching.
 */

import { b, story } from "./authoring";
import type { StoryDef } from "../types";

export const MICRO_STORIES: StoryDef[] = [
  story({
    id: "MICRO_SACCADE",
    category: "MICRO",
    note: "A pair of tiny eye darts and back. Pure eye life.",
    cooldown: 2_600,
    beats: [
      b("ACTION", 0, { gaze: "GLANCE_LEFT" }),
      b("RECOVERY", 420, {}),
    ],
    duration: 900,
  }),
  story({
    id: "MICRO_MOUTH_TWITCH",
    category: "MICRO",
    note: "The smile shifts by a hair, as if he almost said something.",
    beats: [b("ACTION", 0, { mouth: "MOUTH_TWITCH" }), b("RECOVERY", 480, {})],
    duration: 980,
  }),
  story({
    id: "MICRO_BREATH",
    category: "MICRO",
    note: "One deeper breath in an otherwise even rhythm.",
    drives: { sleepiness: 0.4 },
    beats: [
      b("ACTION", 0, { primitive: "BREATHE", amount: 0.5 }),
      b("RECOVERY", 900, {}),
    ],
    duration: 1_500,
  }),
  story({
    id: "MICRO_WEIGHT_SHIFT",
    category: "MICRO",
    note: "He leans onto the other side of his own mass and stays there.",
    beats: [
      b("ACTION", 0, { primitive: "SWAY", dir: 1, amount: 0.35 }),
      b("RECOVERY", 820, {}),
    ],
    duration: 1_400,
  }),
  story({
    id: "MICRO_CHEEK_SETTLE",
    category: "MICRO",
    note: "The lower lobes settle after nothing in particular.",
    beats: [
      b("ACTION", 0, { primitive: "SETTLE", amount: 0.35 }),
      b("RECOVERY", 700, {}),
    ],
    duration: 1_200,
  }),
  story({
    id: "MICRO_SHADOW_CHECK",
    category: "MICRO",
    note: "Down at his own shadow for a moment, then straight back up.",
    drives: { curiosity: 0.45, boredom: 0.4 },
    beats: [b("NOTICE", 0, { gaze: "LOOK_DOWN" }), b("RECOVERY", 700, {})],
    duration: 1_350,
  }),
];
