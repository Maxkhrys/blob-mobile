/**
 * Surprise and startle. These are mostly reflexes: high priority, low
 * interruptibility, and a recovery that includes checking whether anyone saw.
 */

import { b, story } from "./authoring";
import type { StoryDef } from "../types";

export const SURPRISED_STORIES: StoryDef[] = [
  story({
    id: "STARTLE_TINY_RECOIL",
    category: "SURPRISED",
    note: "A small flinch. Used for gentle surprises.",
    cooldown: 7_000,
    priority: 82,
    interruptible: false,
    requires: { events: ["TOUCH_TAP", "GRAB_START", "WALL_PRESS"] },
    drives: { startle: 0.4 },
    beats: [
      b("NOTICE", 0, { expression: "CURIOUS_WIDE", blink: true }),
      b("ACTION", 60, { primitive: "RECOIL", dir: 0, amount: 0.4 }),
      b("RECOVERY", 900, { primitive: "SETTLE", expression: "SOFT_SQUINT" }),
    ],
    duration: 1_900,
  }),
  story({
    id: "STARTLE_BIG_RECOIL",
    category: "SURPRISED",
    note: "A real jump backward. Reserved for hard events.",
    cooldown: 9_000,
    priority: 92,
    interruptible: false,
    requires: { events: ["FLICK", "WALL_IMPACT", "DRAG_FAST"], minDrive: { startle: 0.35 } },
    drives: { startle: 0.8 },
    beats: [
      b("NOTICE", 0, { expression: "PANIC_EYES", mouth: "MOUTH_O", blink: true }),
      b("ACTION", 50, { primitive: "RECOIL", dir: 0, amount: 1, body: "SHOCKED_RECOIL" }),
      b("REACTION", 800, { primitive: "SHIVER", amount: 0.7 }),
      b("REACTION", 1_500, { gaze: "GLANCE_LEFT", expression: "CURIOUS_WIDE" }),
      b("RECOVERY", 2_300, { primitive: "SETTLE", expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX" }),
    ],
    duration: 3_400,
  }),
  story({
    id: "STARTLE_FREEZE",
    category: "SURPRISED",
    note: "Everything locks. That is more unsettling than moving.",
    cooldown: 26_000,
    priority: 78,
    interruptible: false,
    requires: { events: ["FLICK", "WALL_IMPACT", "GRAB_START", "NEARBY_DETECTED"] },
    drives: { startle: 0.6, confidence: -0.3 },
    beats: [
      b("NOTICE", 0, { expression: "PANIC_EYES", blink: true }),
      b("ACTION", 70, { primitive: "SHRINK", amount: 0.5 }),
      b("REACTION", 1_400, { blink: true, expression: "CURIOUS_WIDE" }),
      b("RECOVERY", 2_200, { primitive: "SETTLE", expression: "SOFT_SQUINT" }),
    ],
    duration: 3_100,
  }),
  story({
    id: "STARTLE_POP_UP",
    category: "SURPRISED",
    note: "He pops straight upward, which is never elegant.",
    cooldown: 30_000,
    priority: 86,
    interruptible: false,
    requires: { events: ["FLICK", "WALL_IMPACT", "TOUCH_DOUBLE_TAP"] },
    drives: { startle: 0.7, energy: 0.5 },
    beats: [
      b("NOTICE", 0, { expression: "PANIC_EYES", mouth: "MOUTH_O" }),
      b("ACTION", 55, { body: "SURPRISE_POP" }),
      b("REACTION", 1_300, { primitive: "WOBBLE", amount: 0.7 }),
      b("RECOVERY", 2_100, { primitive: "SETTLE", expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX" }),
    ],
    duration: 3_100,
  }),
];
