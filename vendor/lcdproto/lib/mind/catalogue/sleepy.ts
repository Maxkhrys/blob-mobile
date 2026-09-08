/**
 * Sleepy. Low arousal. The trick with this category is that the recovery is
 * usually incomplete — he does not wake up properly, he just stops sinking.
 */

import { b, story } from "./authoring";
import type { StoryDef } from "../types";

export const SLEEPY_STORIES: StoryDef[] = [
  story({
    id: "SLEEPY_YAWN",
    category: "SLEEPY",
    note: "A full yawn with a stretch on the way out.",
    cooldown: 34_000,
    drives: { sleepiness: 0.8, energy: -0.3 },
    emotion: { arousal: 0.18 },
    beats: [
      b("NOTICE", 0, { expression: "SLEEPY_EYES" }),
      b("ANTICIPATION", 160, { primitive: "STRETCH_UP", amount: 0.5, mouth: "SMALL_O" }),
      b("ACTION", 380, { body: "SLEEPY_YAWN", mouth: "YAWN" }),
      b("REACTION", 2_100, { blink: true, mouth: "YAWN", holdMs: 200 }),
      b("RECOVERY", 2_800, { primitive: "SLUMP", amount: 0.5, mouth: "MOUTH_RELAX" }),
    ],
    duration: 4_100,
  }),
  story({
    id: "SLEEPY_FIGHT_YAWN",
    category: "SLEEPY",
    note: "He tries to hold the yawn in and loses.",
    cooldown: 62_000,
    rarity: "RARE",
    drives: { sleepiness: 0.75, confidence: 0.4 },
    beats: [
      b("NOTICE", 0, { expression: "SLEEPY_EYES" }),
      b("ANTICIPATION", 130, { expression: "SOFT_SQUINT", primitive: "SQUISH", amount: 0.35 }),
      b("ACTION", 700, { body: "SLEEPY_YAWN", mouth: "MOUTH_O", expression: "SLEEPY_EYES" }),
      b("REACTION", 2_400, { mouth: "MOUTH_FLIP" }),
      b("RECOVERY", 3_100, { primitive: "SLUMP", amount: 0.6, mouth: "MOUTH_RELAX" }),
    ],
    duration: 4_400,
  }),
  story({
    id: "SLEEPY_LONG_BLINK",
    category: "SLEEPY",
    note: "He nods off mid-blink and catches himself.",
    cooldown: 24_000,
    drives: { sleepiness: 0.7 },
    beats: [
      // Was three eye-only beats, which measured below the visible floor: on
      // the panel it read as nothing happening. The blink now carries the
      // whole body — he sags into it, then snaps back awake.
      b("NOTICE", 0, { expression: "SLEEPY_EYES", blink: true }),
      b("ACTION", 500, { primitive: "SLUMP", amount: 0.85, blink: true }),
      b("REACTION", 1_500, { primitive: "NOD", amount: 0.9, mouth: "MOUTH_O" }),
      b("RECOVERY", 2_100, {
        expression: "SOFT_SQUINT",
        primitive: "SETTLE",
        amount: 0.6,
        mouth: "MOUTH_RELAX",
      }),
    ],
    duration: 3_200,
  }),
  story({
    id: "SLEEPY_SLOW_MELT",
    category: "SLEEPY",
    note: "He gives up on holding his own shape for a while.",
    cooldown: 40_000,
    drives: { sleepiness: 0.85, energy: -0.4 },
    emotion: { arousal: 0.12 },
    beats: [
      b("NOTICE", 0, { expression: "SLEEPY_EYES" }),
      b("ACTION", 200, { body: "SLEEPY_MELT", primitive: "SLUMP", amount: 0.9 }),
      b("RECOVERY", 2_400, { primitive: "SETTLE", amount: 0.5 }),
    ],
    duration: 3_600,
  }),
  story({
    id: "SLEEPY_ALMOST_ASLEEP",
    category: "SLEEPY",
    note: "He very nearly goes under, then catches it.",
    cooldown: 70_000,
    rarity: "RARE",
    drives: { sleepiness: 0.9, energy: -0.4 },
    beats: [
      b("ACTION", 0, { expression: "SLEEPY_EYES", primitive: "SLUMP", amount: 0.7 }),
      b("ACTION", 1_200, { blink: true, primitive: "NOD", amount: 1 }),
      b("REACTION", 2_400, { expression: "CURIOUS_WIDE", primitive: "STRETCH_UP", amount: 0.6, blink: true }),
      b("RECOVERY", 3_200, { expression: "SLEEPY_EYES", primitive: "SETTLE" }),
    ],
    duration: 4_400,
  }),
  story({
    id: "SLEEPY_DRIFT",
    category: "SLEEPY",
    note: "He drifts slowly to one side while barely awake.",
    cooldown: 36_000,
    dest: "DOWN_LEFT",
    drives: { sleepiness: 0.75, energy: -0.3 },
    beats: [
      b("NOTICE", 0, { expression: "SLEEPY_EYES", gaze: "LOOK_DOWN" }),
      b("ACTION", 300, { destination: "DOWN_LEFT", body: "BREATH_STRETCH" }),
      b("RECOVERY", 3_000, { primitive: "SETTLE" }),
    ],
    duration: 4_200,
  }),
  story({
    id: "SLEEPY_SETTLE_LOW",
    category: "SLEEPY",
    note: "He lowers himself and widens, which is how he gets comfortable.",
    cooldown: 28_000,
    drives: { sleepiness: 0.7, energy: -0.25 },
    beats: [
      b("ACTION", 0, { expression: "SLEEPY_EYES", primitive: "SQUISH", amount: 0.8 }),
      b("RECOVERY", 1_700, { primitive: "SETTLE", amount: 0.6 }),
    ],
    duration: 2_900,
  }),
  story({
    id: "SLEEPY_TRY_STAY_AWAKE",
    category: "SLEEPY",
    note: "He forces his eyes wide and it lasts about a second.",
    cooldown: 80_000,
    rarity: "RARE",
    drives: { sleepiness: 0.8, confidence: 0.5 },
    beats: [
      b("NOTICE", 0, { expression: "SLEEPY_EYES" }),
      b("ANTICIPATION", 200, { expression: "CURIOUS_WIDE", primitive: "STRETCH_UP", amount: 0.7 }),
      b("REACTION", 1_500, { expression: "SLEEPY_EYES", primitive: "SLUMP", amount: 0.8 }),
      b("RECOVERY", 2_800, { primitive: "SETTLE", blink: true }),
    ],
    duration: 3_900,
  }),
];
