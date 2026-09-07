/**
 * Annoyed. Used sparingly and only when something actually earned it — low
 * patience after repeated handling. He never becomes hostile; the ceiling is
 * "really?".
 */

import { b, story } from "./authoring";
import type { StoryDef } from "../types";

export const ANNOYED_STORIES: StoryDef[] = [
  story({
    id: "ANNOYED_SIDE_EYE",
    category: "ANNOYED",
    note: "A long unimpressed look, directly at you.",
    cooldown: 9_000,
    priority: 70,
    requires: { events: ["TOUCH_TAP", "RAPID_POKES"], maxDrive: { patience: 0.42 } },
    drives: { mischief: 0.5 },
    beats: [
      b("NOTICE", 0, { gaze: "GLANCE_LEFT" }),
      b("ACTION", 150, { expression: "DEADPAN_EYES", body: "DEADPAN_SIDE_EYE", mouth: "MOUTH_FLIP" }),
      b("REACTION", 1_800, { blink: true }),
      b("RECOVERY", 2_500, { expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX", primitive: "SETTLE" }),
    ],
    duration: 3_500,
  }),
  story({
    id: "ANNOYED_TURN_AWAY",
    category: "ANNOYED",
    note: "He turns away, then immediately looks back to check.",
    cooldown: 44_000,
    rarity: "UNCOMMON",
    dest: "LEFT",
    requires: { maxDrive: { patience: 0.38 } },
    beats: [
      b("NOTICE", 0, { expression: "ANGRY_BROWS" }),
      b("ACTION", 200, { destination: "LEFT", body: "JELLY_TWIST_LEFT", gaze: "GLANCE_LEFT" }),
      b("REACTION", 1_700, { gaze: "GLANCE_RIGHT", expression: "ONE_EYE_SQUINT_LEFT" }),
      b("RECOVERY", 2_700, { destination: "CENTER", primitive: "SETTLE", expression: "SOFT_SQUINT" }),
    ],
    duration: 3_900,
  }),
  story({
    id: "ANNOYED_SHAKE_OFF",
    category: "ANNOYED",
    note: "He shakes off whatever you have been doing to him.",
    cooldown: 24_000,
    priority: 46,
    requires: { events: ["TOUCH_TAP", "RAPID_POKES", "RELEASE", "WALL_PRESS"], maxDrive: { patience: 0.5 } },
    beats: [
      b("NOTICE", 0, { expression: "ANGRY_BROWS" }),
      b("ACTION", 120, { primitive: "SHAKE_OFF", amount: 1 }),
      b("REACTION", 1_400, { expression: "DEADPAN_EYES" }),
      b("RECOVERY", 2_200, { primitive: "SETTLE", expression: "SOFT_SQUINT" }),
    ],
    duration: 3_100,
  }),
  story({
    id: "ANNOYED_REALLY",
    category: "ANNOYED",
    note: "The deadpan 'really?'. Earned only by sustained nonsense.",
    cooldown: 70_000,
    rarity: "RARE",
    priority: 50,
    requires: { events: ["RAPID_POKES", "WALL_IMPACT"], maxDrive: { patience: 0.3 } },
    beats: [
      b("NOTICE", 0, { blink: true }),
      b("ACTION", 160, { expression: "DEADPAN_EYES", mouth: "MOUTH_FLIP", primitive: "LEAN", dir: 0, amount: 0.3 }),
      b("REACTION", 2_000, { gaze: "GLANCE_RIGHT" }),
      b("RECOVERY", 2_900, { expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX", primitive: "SETTLE" }),
    ],
    duration: 3_900,
  }),
];
