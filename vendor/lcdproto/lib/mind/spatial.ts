/**
 * Cherri Mind 3.1 — the spatial urge.
 *
 * V2 made Cherri alive in the face and dead in space: performances were picked
 * on mood alone, so relocating only ever happened when a story that happened to
 * carry a destination won the scoring round. In practice that was roughly two
 * moves a minute, and because the categories that own most of the off-centre
 * stories also returned to centre, the path read CENTER -> X -> CENTER forever.
 *
 * This module adds the missing half: a slow scalar that says "I want to be
 * somewhere else", plus the deliberate choice of *where*. The director consults
 * it before scoring, so a relocation can be the reason for a performance rather
 * than a side effect of one.
 *
 * Nothing here touches a pose. It is four scalars and a weighted pick.
 */

import type { BlobDestination } from "../blobMind";
import type { MindMemory } from "./memory";
import { approach, clamp01, type SeededRandom } from "./rng";
import type { Drives, Emotion, MovementEnergy, Personality, StoryCategory, StoryDef } from "./types";

/** Every zone that is not the middle of the display. */
export const OUTER_ZONES: readonly BlobDestination[] = [
  "LEFT",
  "RIGHT",
  "UP_LEFT",
  "UP_RIGHT",
  "DOWN_LEFT",
  "DOWN_RIGHT",
];

export const ALL_ZONES: readonly BlobDestination[] = ["CENTER", ...OUTER_ZONES];

/** Dev-only global scale on how eager the whole movement system is. */
export const MOVEMENT_ENERGY_GAIN: Record<MovementEnergy, number> = {
  LOW: 0.62,
  NORMAL: 1,
  HIGH: 1.48,
};

/** Above this, the director stops waiting for a travelling story to win and
 *  goes looking for one on purpose. */
export const EXPLORE_THRESHOLD = 0.52;

/** Rough screen-space positions, used only to reason about trip length. */
const ZONE_XY: Record<BlobDestination, { x: number; y: number }> = {
  CENTER: { x: 0, y: 0 },
  UP_LEFT: { x: -85, y: -72 },
  UP_RIGHT: { x: 85, y: -72 },
  LEFT: { x: -105, y: -6 },
  RIGHT: { x: 105, y: -6 },
  DOWN_LEFT: { x: -82, y: 68 },
  DOWN_RIGHT: { x: 82, y: 68 },
};

/** Normalised 0..1 distance between two zones. */
export function zoneDistance(a: BlobDestination, b: BlobDestination): number {
  const pa = ZONE_XY[a];
  const pb = ZONE_XY[b];
  const dx = pa.x - pb.x;
  const dy = pa.y - pb.y;
  return clamp01(Math.sqrt(dx * dx + dy * dy) / 220);
}

/** Why Cherri decided to go somewhere. Drives which stories fit the trip. */
export type MovementReason =
  | "EXPLORE"
  | "PLAY"
  | "SETTLE"
  | "RETREAT"
  | "SEEK_ATTENTION"
  | "REST";

export interface MovementIntent {
  zone: BlobDestination;
  reason: MovementReason;
  /** 0..1 trip length, so the director can pick a matching movement profile. */
  distance: number;
}

/**
 * The urge itself. It rises with time spent in one place and with the drives
 * that make a creature restless, and it is held down by sleepiness and by
 * having just moved.
 */
export class SpatialUrge {
  private value = 0;
  /** Where the urge stood last tick, for the Mind Lab readout. */
  private lastTarget = 0;

  reset() {
    this.value = 0;
    this.lastTarget = 0;
  }

  get level() {
    return this.value;
  }

  get target() {
    return this.lastTarget;
  }

  /**
   * One decision tick of integration.
   *
   * @param timeInZoneMs how long he has been parked where he is
   * @param gain         the dev movement-energy multiplier
   */
  update(
    dtMs: number,
    drives: Drives,
    timeInZoneMs: number,
    gain: number,
    resting: boolean
  ) {
    // Residence: sitting in one place is the primary source of pressure.
    const residence = clamp01((timeInZoneMs - 1_200) / 8_000);
    // Appetite: the drives that make a creature want to be elsewhere.
    const appetite = clamp01(
      drives.boredom * 0.4 + drives.curiosity * 0.34 + drives.playfulness * 0.26
    );
    // Rest: what argues for staying exactly where he is.
    const rest = clamp01(drives.sleepiness * 0.78 + (1 - drives.energy) * 0.22);

    const target = clamp01(
      (residence * (0.46 + appetite * 0.86) - rest * 0.6) * gain - (resting ? 0.25 : 0)
    );
    this.lastTarget = target;

    // Rising is eager, falling is lazy: an urge that has built should not be
    // erased by one calm second, or the explore path would never fire.
    const rateHz = target > this.value ? 0.34 * gain : 0.22;
    this.value = clamp01(approach(this.value, target, rateHz, dtMs));
  }

  /**
   * Spends the urge on a completed trip. A long traversal satisfies far more of
   * it than a small shuffle, which is what stops him pacing without pause.
   */
  spend(distance: number) {
    this.value = clamp01(this.value * (0.34 - distance * 0.2));
  }
}

/**
 * Chooses where to go, deliberately.
 *
 * The weights encode the brief: curious and bored Cherri hunts novelty, playful
 * Cherri takes the long way, sleepy Cherri sinks, shy Cherri hugs an edge and
 * affectionate Cherri comes back in. The one hard rule is that he never bounces
 * straight back to the zone he just left — that was the robotic ping-pong.
 */
export function chooseDestination(
  memory: MindMemory,
  drives: Drives,
  emotion: Emotion,
  personality: Personality,
  rng: SeededRandom
): MovementIntent {
  const current = memory.currentZone;
  const previous = memory.previousZone;

  const sleepy = drives.sleepiness;
  const playful = drives.playfulness;
  const curious = drives.curiosity;
  const bored = drives.boredom;
  const affection = drives.affection;
  const shy = clamp01(1 - emotion.confidence) * clamp01(1 - personality.confidence);

  const weights: { zone: BlobDestination; weight: number }[] = [];

  for (const zone of ALL_ZONES) {
    if (zone === current) continue;
    const distance = zoneDistance(current, zone);
    const recency = memory.zoneRecency(zone);
    // Novelty: a zone he has never used, or has not used in a while.
    const novelty = recency < 0 ? 1 : clamp01(recency / 6);

    let weight = 0.35;
    weight += novelty * (0.5 + (curious + bored) * 0.55);

    if (zone === "CENTER") {
      // Centre is one destination among seven, not the default home.
      weight += affection * 0.75 + sleepy * 0.2;
      weight -= (curious + bored) * 0.3;
    } else {
      weight += 0.2;
      const pos = ZONE_XY[zone];
      // Sleepy Cherri sinks and moves as little as he can get away with.
      if (pos.y > 0) weight += sleepy * 0.85;
      if (pos.y < 0) weight += clamp01(emotion.arousal) * 0.3 - sleepy * 0.5;
      // Shy Cherri wants an edge to hug.
      if (Math.abs(pos.x) > 95) weight += shy * 0.7;
    }

    // Trip length preference: playful goes far, sleepy stays near.
    weight += playful * distance * 0.85;
    weight -= sleepy * distance * 0.9;

    // Never bounce straight back the way he came.
    if (zone === previous) weight *= 0.18;

    weights.push({ zone, weight: Math.max(0.02, weight) });
  }

  let total = 0;
  for (const entry of weights) total += entry.weight;
  let roll = clamp01(rng.next()) * total;
  let chosen = weights[weights.length - 1];
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) {
      chosen = entry;
      break;
    }
  }

  return {
    zone: chosen.zone,
    reason: reasonFor(chosen.zone, drives, emotion, shy),
    distance: zoneDistance(current, chosen.zone),
  };
}

function reasonFor(
  zone: BlobDestination,
  drives: Drives,
  emotion: Emotion,
  shy: number
): MovementReason {
  if (drives.sleepiness > 0.55) return "REST";
  if (shy > 0.4 && zone !== "CENTER") return "RETREAT";
  if (zone === "CENTER" && drives.affection > 0.55) return "SETTLE";
  if (drives.playfulness > 0.55 && emotion.arousal > 0.4) return "PLAY";
  if (drives.attentionNeed > 0.6) return "SEEK_ATTENTION";
  return "EXPLORE";
}

/** Story categories that read naturally as "he went there and did a thing". */
const REASON_CATEGORIES: Record<MovementReason, readonly StoryCategory[]> = {
  EXPLORE: ["CURIOUS", "IDLE", "MISCHIEF"],
  PLAY: ["PLAYFUL", "HAPPY", "MISCHIEF"],
  SETTLE: ["AFFECTIONATE", "HAPPY", "IDLE"],
  RETREAT: ["SHY", "IDLE"],
  SEEK_ATTENTION: ["AFFECTIONATE", "CURIOUS", "PLAYFUL"],
  REST: ["SLEEPY", "IDLE"],
};

/** How well a story suits the trip that was already decided on. */
export function reasonAffinity(def: StoryDef, reason: MovementReason): number {
  const list = REASON_CATEGORIES[reason];
  const index = list.indexOf(def.category);
  if (index === 0) return 1;
  if (index > 0) return 0.72;
  return 0.24;
}

/**
 * Whether a story can be re-staged in a different zone.
 *
 * This is the change that actually unlocks the world. Only 30 of 135 authored
 * performances carry a destination; the rest are perfectly good little acts
 * that simply assume centre. A story with no destination beat of its own has no
 * opinion about where it happens, so the explore path is free to play it
 * somewhere else — and Cherri gets "travel there, then do something there"
 * without the catalogue being rewritten.
 */
export function isRetargetable(def: StoryDef): boolean {
  if (def.category === "MICRO") return false;
  // Reactions to touch belong wherever the touch happened.
  if (def.category === "INTERACTION") return false;
  if (def.requires?.events) return false;
  if (def.movementMode === "STAY") return false;
  return !def.beats.some((beat) => beat.destination !== undefined);
}

/**
 * Where a story would actually put Cherri.
 *
 * The catalogue authors 105 of its 135 performances with destination CENTER,
 * but almost none of those mean "walk to the middle of the display" — they
 * mean "I have no opinion about where this happens". V2 took them literally,
 * which is why every trip was followed by a trip home and the path read
 * CENTER -> X -> CENTER forever. A placeless story now happens wherever he is
 * standing, so an outer zone gets lived in instead of bounced off.
 */
export function effectiveDestination(
  def: StoryDef,
  currentZone: BlobDestination,
  exploreTarget?: BlobDestination
): BlobDestination {
  if (!isPlaceless(def)) return def.destination;
  // The explore path may only re-aim a story that is free to travel.
  if (exploreTarget !== undefined && isRetargetable(def)) return exploreTarget;
  return currentZone;
}

/**
 * Whether a story has a real spatial opinion, or just plays where he stands.
 *
 * This is deliberately broader than isRetargetable. A blink is authored at
 * CENTER and is not something the explore path may re-aim, but it still must
 * not drag him back across the display — under V2 the micro-life between
 * performances was itself a trip home, which is most of where the ping-pong
 * came from. Only an authored destination beat counts as a real opinion.
 */
export function isPlaceless(def: StoryDef): boolean {
  if (def.destination !== "CENTER") return false;
  return !def.beats.some((beat) => beat.destination !== undefined);
}

/** A short label for the Mind Lab: what movement is likely to happen next. */
export function movementBiasLabel(
  urge: number,
  drives: Drives,
  currentZone: BlobDestination
): string {
  if (drives.sleepiness > 0.6) return "SETTLING — low movement";
  if (urge >= EXPLORE_THRESHOLD) {
    return currentZone === "CENTER" ? "READY TO EXPLORE" : "READY TO MOVE ON";
  }
  if (urge >= 0.3) return "BUILDING";
  return "CONTENT — staying put";
}
