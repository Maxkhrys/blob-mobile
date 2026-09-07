import type { ExpressionRecipe } from "./types";

/**
 * The core expression vocabulary.
 *
 * Source of truth for facial acting across all states and character renderers.
 * These use the current production face language: clean black eyes,
 * negative-space aperture lids, floating pill brows, and parametric
 * curve/D/O mouth.
 *
 * READABILITY (Cherri 3.1)
 * ------------------------
 * These recipes were re-authored against the renderer's real geometry, because
 * the previous set was technically distinct but visually near-neutral: HAPPY
 * differed from NEUTRAL by 2% of eye width and a 2.4 degree brow tilt, which is
 * invisible on a 466x466 panel. The channel budgets that actually matter are:
 *
 *   eye aperture   `open` scales the ~52px eye height, so it is by far the
 *                  loudest channel; 1.0 -> 0.5 is a 26px change.
 *   brow height    drawEyebrow moves the brow by browLift * eyeHeight * 0.20,
 *                  i.e. ~10px per 1.0 unit. The old values (0.02-0.22) moved it
 *                  0.2-2.3px. Brow *arch* is not a usable channel: it saturates
 *                  at the renderer's 3.2 clamp almost immediately.
 *   brow tilt      clamped to +/-11 degrees, and gaze already spends up to 4.5
 *                  of that, so authored tilt lives in roughly +/-9.
 *   socket scale   clamped to [0.72, 1.35]; the old 0.95-1.12 barely used it.
 *   asymmetry      cheap and extremely readable — the signature of CURIOUS and
 *                  SMUG rather than a subtle garnish.
 *
 * Sign convention for the brow pair: left negative / right positive angles the
 * pair outward-and-down (sad, pleading); left positive / right negative angles
 * it inward-and-down (angry, focused).
 *
 * tests/expression-readability.cjs scores every recipe against these channels
 * and fails the build if one drifts back toward neutral.
 */

const eye = (
  values: Partial<import("./types").EyeRecipe> = {}
): import("./types").EyeRecipe => ({
  socketX: 0,
  socketY: 0,
  width: 1,
  height: 1,
  open: 1,
  browLift: 0,
  browTilt: 0,
  lidBias: 0,
  ...values,
});

export const CORE_EXPRESSIONS: readonly ExpressionRecipe[] = [
  {
    id: "NEUTRAL",
    label: "Neutral",
    category: "core",
    description: "Default calm baseline with soft ambient smile",
    defaultTransitionMs: 250,
    // tier: BASELINE
    leftEye: eye(),
    rightEye: eye(),
    mouth: {
      x: 0,
      y: 0,
      width: 1.0,
      height: 1.0,
      curve: 0.82,
      dAmount: 0.0,
      oAmount: 0.0
    },
  },
  {
    id: "HAPPY",
    label: "Happy",
    category: "core",
    description: "Joy-squinted crescent eyes under raised brows with a full crescent grin",
    defaultTransitionMs: 210,
    // tier: OBVIOUS
    leftEye: eye({ socketY: -3.0, width: 1.14, height: 0.88, open: 0.52, browLift: 0.62, browTilt: -5.0, lidBias: 0.18 }),
    rightEye: eye({ socketY: -3.0, width: 1.14, height: 0.88, open: 0.52, browLift: 0.62, browTilt: 5.0, lidBias: -0.18 }),
    mouth: {
      x: 0,
      y: -3.2,
      width: 1.18,
      height: 1.2,
      curve: 1.0,
      dAmount: 0.0,
      oAmount: 0.0,
      crescentSmileAmount: 1.0
    },
  },
  {
    id: "EXCITED",
    label: "Excited",
    category: "core",
    description: "Eyes at full stretch, brows thrown high, wide open D grin",
    defaultTransitionMs: 170,
    // tier: OBVIOUS
    leftEye: eye({ socketY: -5.5, width: 1.24, height: 1.32, open: 1.0, browLift: 1.05, browTilt: -7.0 }),
    rightEye: eye({ socketY: -5.5, width: 1.24, height: 1.32, open: 1.0, browLift: 1.05, browTilt: 7.0 }),
    mouth: {
      x: 0,
      y: -3.5,
      width: 1.18,
      height: 1.24,
      curve: 0.95,
      dAmount: 1.0,
      oAmount: 0.32
    },
  },
  {
    id: "CURIOUS",
    label: "Curious",
    category: "core",
    description: "Hard asymmetry: one eye wide under a cocked brow, the other narrowed",
    defaultTransitionMs: 230,
    // tier: OBVIOUS
    leftEye: eye({ socketX: -2.5, socketY: -4.5, width: 1.16, height: 1.2, open: 1.0, browLift: 1.0, browTilt: -9.0, lidBias: 0.22 }),
    rightEye: eye({ socketX: 2.5, socketY: 3.0, width: 0.86, height: 0.8, open: 0.56, browLift: -0.3, browTilt: 3.0, lidBias: -0.28 }),
    mouth: {
      x: 4.0,
      y: 0.5,
      width: 0.74,
      height: 0.92,
      curve: 0.3,
      dAmount: 0.1,
      oAmount: 0.5
    },
  },
  {
    id: "ANGRY",
    label: "Angry",
    category: "core",
    description: "Brows driven down and inward over hard slits, jaw clamped into a flat grimace",
    defaultTransitionMs: 190,
    // tier: OBVIOUS
    leftEye: eye({ socketY: 2.5, width: 1.12, height: 0.76, open: 0.38, browLift: -0.55, browTilt: 10.0, lidBias: -0.5 }),
    rightEye: eye({ socketY: 2.5, width: 1.12, height: 0.76, open: 0.38, browLift: -0.55, browTilt: -10.0, lidBias: 0.5 }),
    mouth: {
      x: 0,
      y: 2.8,
      width: 0.7,
      height: 1.16,
      curve: -0.95,
      dAmount: 0.95,
      oAmount: 0.0
    },
  },
  {
    id: "SAD",
    label: "Sad",
    category: "core",
    description: "Inner brow apex, heavy drooping lids and a deep downturned pout",
    defaultTransitionMs: 290,
    // tier: OBVIOUS
    leftEye: eye({ socketY: 4.5, width: 0.88, height: 0.86, open: 0.44, browLift: -0.15, browTilt: -9.0, lidBias: 0.45 }),
    rightEye: eye({ socketY: 4.5, width: 0.88, height: 0.86, open: 0.44, browLift: -0.15, browTilt: 9.0, lidBias: -0.45 }),
    mouth: {
      x: 0,
      y: 3.2,
      width: 0.72,
      height: 0.86,
      curve: -1.0,
      dAmount: 0.15,
      oAmount: 0.0
    },
  },
  {
    id: "SLEEPY",
    label: "Sleepy",
    category: "core",
    description: "Lids almost shut under flat heavy brows, mouth slack and small",
    defaultTransitionMs: 360,
    // tier: OBVIOUS
    leftEye: eye({ socketY: 3.5, width: 0.92, height: 0.82, open: 0.16, browLift: -0.35, browTilt: 0.0, lidBias: 0.2 }),
    rightEye: eye({ socketY: 3.5, width: 0.92, height: 0.82, open: 0.16, browLift: -0.35, browTilt: 0.0, lidBias: 0.2 }),
    mouth: {
      x: 0,
      y: 2.4,
      width: 0.74,
      height: 0.74,
      curve: 0.1,
      dAmount: 0.0,
      oAmount: 0.22
    },
  },
  {
    id: "SURPRISED",
    label: "Surprised",
    category: "core",
    description: "Eyes blown to maximum under vaulted brows with a round O mouth",
    defaultTransitionMs: 150,
    // tier: OBVIOUS
    leftEye: eye({ socketY: -6.0, width: 1.3, height: 1.35, open: 1.0, browLift: 1.15, browTilt: 0.0 }),
    rightEye: eye({ socketY: -6.0, width: 1.3, height: 1.35, open: 1.0, browLift: 1.15, browTilt: 0.0 }),
    mouth: {
      x: 0,
      y: -0.8,
      width: 0.66,
      height: 1.24,
      curve: 0.0,
      dAmount: 0.0,
      oAmount: 1.0
    },
  },
  {
    id: "HAPPY_SOFT",
    label: "Soft Happy",
    category: "core",
    description: "Contented near-closed eyes and a small warm crescent — the quiet cousin of HAPPY",
    defaultTransitionMs: 250,
    // tier: CLEAR
    leftEye: eye({ socketY: -0.5, width: 1.0, height: 0.84, open: 0.3, browLift: 0.2, browTilt: -2.5, lidBias: 0.3 }),
    rightEye: eye({ socketY: -0.5, width: 1.0, height: 0.84, open: 0.3, browLift: 0.2, browTilt: 2.5, lidBias: -0.3 }),
    mouth: {
      x: 0,
      y: -1.2,
      width: 0.94,
      height: 1.0,
      curve: 0.9,
      dAmount: 0.0,
      oAmount: 0.0,
      crescentSmileAmount: 0.72
    },
  },
  {
    id: "SMUG",
    label: "Smug",
    category: "core",
    description: "One brow cocked high over a wide eye, the other narrowed, grin shoved to one side",
    defaultTransitionMs: 220,
    // tier: OBVIOUS
    leftEye: eye({ socketX: -1.5, socketY: -3.5, width: 1.12, height: 1.08, open: 1.0, browLift: 0.95, browTilt: -8.5, lidBias: 0.18 }),
    rightEye: eye({ socketX: 1.5, socketY: 2.5, width: 0.88, height: 0.82, open: 0.46, browLift: -0.35, browTilt: 2.5, lidBias: -0.4 }),
    mouth: {
      x: 5.0,
      y: -2.0,
      width: 1.06,
      height: 1.12,
      curve: 0.98,
      dAmount: 0.0,
      oAmount: 0.0,
      crescentSmileAmount: 1.0
    },
  },
  {
    id: "RECOGNIZED",
    label: "Recognized",
    category: "core",
    description: "Bright double-take: eyes and brows snap up together over a full crescent grin",
    defaultTransitionMs: 180,
    // tier: OBVIOUS
    leftEye: eye({ socketY: -4.5, width: 1.2, height: 1.24, open: 1.0, browLift: 0.9, browTilt: -4.0 }),
    rightEye: eye({ socketY: -4.5, width: 1.2, height: 1.24, open: 1.0, browLift: 0.9, browTilt: 4.0 }),
    mouth: {
      x: 0,
      y: -2.6,
      width: 1.12,
      height: 1.14,
      curve: 0.98,
      dAmount: 0.0,
      oAmount: 0.0,
      crescentSmileAmount: 1.0
    },
  },
  {
    id: "AFFECTIONATE",
    label: "Affectionate",
    category: "core",
    description: "Tender half-lidded gaze with outward-tilted brows and a soft warm smile",
    defaultTransitionMs: 270,
    // tier: CLEAR
    leftEye: eye({ socketY: 1.5, width: 1.06, height: 0.92, open: 0.4, browLift: 0.45, browTilt: -6.5, lidBias: 0.35 }),
    rightEye: eye({ socketY: 1.5, width: 1.06, height: 0.92, open: 0.4, browLift: 0.45, browTilt: 6.5, lidBias: -0.35 }),
    mouth: {
      x: 0,
      y: -1.0,
      width: 1.0,
      height: 1.06,
      curve: 0.94,
      dAmount: 0.0,
      oAmount: 0.0,
      crescentSmileAmount: 0.9
    },
  },
] as const;

export const CORE_EXPRESSION_MAP: Record<string, ExpressionRecipe> =
  Object.fromEntries(CORE_EXPRESSIONS.map((e) => [e.id, e]));

export function getCoreExpression(id: string): ExpressionRecipe {
  return CORE_EXPRESSION_MAP[id] ?? CORE_EXPRESSIONS[0];
}
