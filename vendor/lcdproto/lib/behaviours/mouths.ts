/**
 * Cherri Mind V4.5 mouth vocabulary.
 *
 * Geometric recipes only: springs, scalars, a tongue amount. No particles,
 * no emoji, no assets. The same table can drive an ESP32 scanline renderer.
 */

import type { MouthBehaviour } from "./types";

export interface MouthRecipe {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  curve: number;
  o: number;
  d: number;
  crescent: number;
  /** 0 closed lips, 1 a clipped pink oval inside the open mouth. */
  tongue: number;
  durationMs: number;
  family: MouthFamily;
}

export type MouthFamily =
  | "RELAX"
  | "SMILE"
  | "LAUGH"
  | "O"
  | "FROWN"
  | "SMIRK"
  | "TONGUE"
  | "FLAT"
  | "YAWN";

export const MOUTH_FAMILIES: readonly MouthFamily[] = [
  "RELAX",
  "SMILE",
  "LAUGH",
  "O",
  "FROWN",
  "SMIRK",
  "TONGUE",
  "FLAT",
  "YAWN",
] as const;

export const MOUTH_RECIPES: Record<MouthBehaviour, MouthRecipe> = {
  MOUTH_RELAX: {
    x: 0, y: 0.55, scaleX: 0.08, scaleY: -0.08, rotation: 0,
    curve: 0.62, o: 0, d: 0, crescent: 0.55, tongue: 0, durationMs: 980, family: "RELAX",
  },
  MOUTH_TWITCH: {
    x: 0.7, y: -0.06, scaleX: 0.05, scaleY: -0.02, rotation: 4,
    curve: 0.7, o: 0, d: 0, crescent: 0.4, tongue: 0, durationMs: 420, family: "SMILE",
  },
  MOUTH_O: {
    x: 0, y: -0.28, scaleX: -0.16, scaleY: 0.1, rotation: 0,
    curve: 0, o: 1, d: 0, crescent: 0, tongue: 0, durationMs: 900, family: "O",
  },
  MOUTH_FLIP: {
    x: 0, y: 0.32, scaleX: -0.1, scaleY: 0.05, rotation: 0,
    curve: -0.92, o: 0, d: 0.12, crescent: 0, tongue: 0, durationMs: 1100, family: "FROWN",
  },
  CRESCENT_SHARP: {
    x: 0, y: 0.12, scaleX: 0.12, scaleY: -0.04, rotation: 0,
    curve: 0.88, o: 0, d: 0, crescent: 1, tongue: 0, durationMs: 1100, family: "SMILE",
  },
  D_SMILE: {
    x: 0, y: -0.08, scaleX: 0.1, scaleY: 0.06, rotation: 0,
    curve: 0.55, o: 0.08, d: 0.82, crescent: 0.15, tongue: 0, durationMs: 1080, family: "SMILE",
  },
  OPEN_LAUGH: {
    x: 0, y: -0.18, scaleX: 0.16, scaleY: 0.22, rotation: 0,
    curve: 0.35, o: 0.42, d: 0.92, crescent: 0.08, tongue: 0, durationMs: 920, family: "LAUGH",
  },
  BIG_LAUGH: {
    x: 0, y: -0.22, scaleX: 0.22, scaleY: 0.32, rotation: 0,
    curve: 0.2, o: 0.55, d: 1, crescent: 0, tongue: 0.35, durationMs: 980, family: "LAUGH",
  },
  SMIRK: {
    x: 0.95, y: -0.12, scaleX: 0.06, scaleY: -0.04, rotation: 7.5,
    curve: 0.78, o: 0, d: 0.18, crescent: 0.55, tongue: 0, durationMs: 1400, family: "SMIRK",
  },
  POUT: {
    x: 0, y: 0.42, scaleX: -0.22, scaleY: 0.12, rotation: 0,
    curve: -0.35, o: 0.22, d: 0.08, crescent: 0, tongue: 0, durationMs: 1200, family: "FROWN",
  },
  GASP: {
    x: 0, y: -0.35, scaleX: -0.22, scaleY: 0.18, rotation: 0,
    curve: 0, o: 1, d: 0, crescent: 0, tongue: 0, durationMs: 720, family: "O",
  },
  SMALL_O: {
    x: 0, y: -0.12, scaleX: -0.28, scaleY: 0.02, rotation: 0,
    curve: 0.05, o: 0.62, d: 0, crescent: 0, tongue: 0, durationMs: 700, family: "O",
  },
  BIG_O: {
    x: 0, y: -0.4, scaleX: -0.08, scaleY: 0.28, rotation: 0,
    curve: 0, o: 1, d: 0.08, crescent: 0, tongue: 0, durationMs: 860, family: "O",
  },
  GRIMACE: {
    x: 0, y: 0.18, scaleX: 0.18, scaleY: -0.12, rotation: 0,
    curve: -0.22, o: 0.05, d: 0.28, crescent: 0, tongue: 0, durationMs: 900, family: "FROWN",
  },
  FLAT: {
    x: 0, y: 0.28, scaleX: 0.28, scaleY: -0.42, rotation: 0,
    curve: 0, o: 0, d: 0, crescent: 0, tongue: 0, durationMs: 1400, family: "FLAT",
  },
  NERVOUS: {
    x: 0.35, y: 0.16, scaleX: -0.08, scaleY: -0.04, rotation: -3,
    curve: 0.18, o: 0.08, d: 0.1, crescent: 0.12, tongue: 0, durationMs: 640, family: "FLAT",
  },
  BLEP: {
    x: 0.32, y: 0.1, scaleX: 0.14, scaleY: 0.18, rotation: 3,
    curve: 0.32, o: 0.48, d: 0.62, crescent: 0.06, tongue: 0.92, durationMs: 1800, family: "TONGUE",
  },
  TONGUE_PEEK: {
    x: 0.16, y: 0.06, scaleX: 0.08, scaleY: 0.1, rotation: 0,
    curve: 0.28, o: 0.4, d: 0.48, crescent: 0.08, tongue: 0.7, durationMs: 900, family: "TONGUE",
  },
  TONGUE_OUT: {
    x: 0, y: 0.14, scaleX: 0.18, scaleY: 0.24, rotation: 0,
    curve: 0.16, o: 0.62, d: 0.78, crescent: 0.02, tongue: 1, durationMs: 1300, family: "TONGUE",
  },
  RASPBERRY: {
    x: 0, y: 0.18, scaleX: 0.24, scaleY: 0.28, rotation: 0,
    curve: 0.04, o: 0.72, d: 0.88, crescent: 0, tongue: 1, durationMs: 1100, family: "TONGUE",
  },
  YAWN: {
    x: 0, y: -0.48, scaleX: -0.04, scaleY: 0.42, rotation: 0,
    curve: -0.08, o: 1, d: 0.22, crescent: 0, tongue: 0, durationMs: 1600, family: "YAWN",
  },
};

const MOUTH_SET: ReadonlySet<string> = new Set(Object.keys(MOUTH_RECIPES));

export const isMouthBehaviour = (id: string): id is MouthBehaviour => MOUTH_SET.has(id);

export const mouthFamilyOf = (id: MouthBehaviour): MouthFamily => MOUTH_RECIPES[id].family;

export const TONGUE_MOUTHS: readonly MouthBehaviour[] = [
  "BLEP",
  "TONGUE_PEEK",
  "TONGUE_OUT",
  "RASPBERRY",
  "BIG_LAUGH",
];
