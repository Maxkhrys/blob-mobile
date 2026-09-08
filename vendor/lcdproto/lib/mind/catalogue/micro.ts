/**
 * Micro-life 2.0. Still cheap and interruptible, but now actually readable:
 * a glance you can see, a mouth that changes, a breath with weight. The
 * director spaces them 2.5–6s apart so they feel like life, not a twitch loop.
 *
 * Body motion stays SMALL on purpose. Face channels (gaze, lids, mouth) carry
 * the personality so these never compete with signature silhouettes.
 */

import { b, story } from "./authoring";
import type { StoryDef } from "../types";

export const MICRO_STORIES: StoryDef[] = [
  story({
    id: "MICRO_SACCADE",
    category: "MICRO",
    note: "A pair of eye darts and back. Pure eye life.",
    cooldown: 2_200,
    beats: [
      b("ACTION", 0, { gaze: "GLANCE_LEFT" }),
      b("REACTION", 380, { gaze: "GLANCE_RIGHT" }),
      b("RECOVERY", 820, {}),
    ],
    duration: 1_200,
  }),
  story({
    id: "MICRO_MOUTH_TWITCH",
    category: "MICRO",
    note: "The smile shifts, as if he almost said something.",
    cooldown: 2_400,
    mouthFamily: "SMILE",
    beats: [
      b("ACTION", 0, { mouth: "MOUTH_TWITCH" }),
      b("RECOVERY", 520, { mouth: "CRESCENT_SHARP" }),
    ],
    duration: 1_100,
  }),
  story({
    id: "MICRO_BREATH",
    category: "MICRO",
    note: "One deeper breath in an otherwise even rhythm.",
    drives: { sleepiness: 0.4 },
    cooldown: 2_800,
    beats: [
      b("ACTION", 0, { primitive: "BREATHE", amount: 0.32, mouth: "SMALL_O" }),
      b("RECOVERY", 1_000, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_700,
  }),
  story({
    id: "MICRO_WEIGHT_SHIFT",
    category: "MICRO",
    note: "He leans onto the other side of his own mass and stays there.",
    cooldown: 2_600,
    beats: [
      b("ACTION", 0, { primitive: "SWAY", dir: 1, amount: 0.22 }),
      b("RECOVERY", 900, {}),
    ],
    duration: 1_500,
  }),
  story({
    id: "MICRO_CHEEK_SETTLE",
    category: "MICRO",
    note: "The lower lobes settle after nothing in particular.",
    cooldown: 2_400,
    beats: [
      b("ACTION", 0, { primitive: "SETTLE", amount: 0.22 }),
      b("RECOVERY", 760, {}),
    ],
    duration: 1_300,
  }),
  story({
    id: "MICRO_SHADOW_CHECK",
    category: "MICRO",
    note: "Down at his own shadow for a moment, then straight back up.",
    drives: { curiosity: 0.45, boredom: 0.4 },
    cooldown: 3_000,
    beats: [
      b("NOTICE", 0, { gaze: "LOOK_DOWN", mouth: "SMALL_O" }),
      b("RECOVERY", 780, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_400,
  }),
  story({
    id: "MICRO_LOOK_AT_YOU",
    category: "MICRO",
    note: "He checks the viewer, smiles a little, looks away.",
    cooldown: 3_200,
    mouthFamily: "SMILE",
    beats: [
      b("NOTICE", 0, { gaze: "LOOK_UP", expression: "SOFT_SQUINT" }),
      b("ACTION", 280, { mouth: "CRESCENT_SHARP" }),
      b("RECOVERY", 900, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_500,
  }),
  story({
    id: "MICRO_SQUINT",
    category: "MICRO",
    note: "A real squint, held, then released.",
    cooldown: 2_800,
    beats: [
      b("ACTION", 0, { expression: "SOFT_SQUINT" }),
      b("RECOVERY", 720, {}),
    ],
    duration: 1_200,
  }),
  story({
    id: "MICRO_HEAD_TILT",
    category: "MICRO",
    note: "A curious head tilt as if a thought arrived.",
    cooldown: 2_600,
    beats: [
      b("ACTION", 0, { gaze: "GLANCE_RIGHT", mouth: "SMALL_O" }),
      b("RECOVERY", 860, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_400,
  }),
  story({
    id: "MICRO_TINY_PUFF",
    category: "MICRO",
    note: "A small proud inhale that rounds him for a beat.",
    cooldown: 3_400,
    silhouette: "TINY_PUFF",
    beats: [
      b("ACTION", 0, { primitive: "PUFF", amount: 0.22, mouth: "CRESCENT_SHARP" }),
      b("RECOVERY", 820, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_400,
  }),
  story({
    id: "MICRO_MOUTH_O",
    category: "MICRO",
    note: "A tiny round mouth, like a silent oh.",
    cooldown: 2_800,
    mouthFamily: "O",
    beats: [
      b("ACTION", 0, { mouth: "SMALL_O", expression: "SOFT_SQUINT" }),
      b("RECOVERY", 640, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_150,
  }),
  story({
    id: "MICRO_SMIRK",
    category: "MICRO",
    note: "One-sided smirk that he quickly puts away.",
    cooldown: 3_600,
    mouthFamily: "SMIRK",
    beats: [
      b("ACTION", 0, { mouth: "SMIRK", expression: "ONE_EYE_SQUINT_LEFT" }),
      b("RECOVERY", 780, { mouth: "MOUTH_RELAX" }),
    ],
    duration: 1_250,
  }),
  story({
    id: "MICRO_BLINK_HOLD",
    category: "MICRO",
    note: "A slower blink that almost becomes a thought.",
    cooldown: 2_200,
    beats: [
      b("ACTION", 0, { blink: true, expression: "SOFT_SQUINT" }),
      b("RECOVERY", 520, {}),
    ],
    duration: 1_000,
  }),
];
