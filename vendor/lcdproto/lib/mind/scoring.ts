/**
 * Utility scoring. One scalar per candidate, no graphs and no allocation
 * beyond the telemetry array the developer tools ask for.
 *
 * The shape of the score is deliberately additive so a single term can be
 * tuned without re-balancing everything else:
 *
 *   context + drive + emotion + trait + novelty
 *   - recency - cooldown - repetition
 */

import type { BlobDestination } from "../blobMind";
import { emotionDistance } from "./emotion";
import { effectiveDestination, isPlaceless } from "./spatial";
import type { MindMemory } from "./memory";
import { clamp, clamp01 } from "./rng";
import {
  RARITY_COOLDOWN_MS,
  RARITY_WEIGHT,
  type CandidateScore,
  type Drives,
  type Emotion,
  type MindEventId,
  type Personality,
  type StoryDef,
} from "./types";

export interface ScoringContext {
  nowMs: number;
  drives: Drives;
  emotion: Emotion;
  personality: Personality;
  memory: MindMemory;
  /** Events seen inside the reaction window, newest first. */
  liveEvents: readonly MindEventId[];
  /** Current escalation step across all chains, 0 when nothing is live. */
  escalation: number;
  msSinceInteraction: number;
  /** 0..1 pressure to relocate. Scales the whole spatial term. */
  spatialUrge: number;
  /**
   * Set while the director is running the deliberate explore path: the zone it
   * has already committed to. Stories that can serve that trip are boosted.
   */
  exploreTarget?: BlobDestination;
}

/** How much a starved rarity tier can climb once its gate has expired. */
const DUE_BONUS: Record<string, number> = {
  UNCOMMON: 0.2,
  RARE: 0.55,
  SPECIAL: 0.95,
};

/** How long an event still counts as "the reason" for a story. */
export const EVENT_WINDOW_MS = 2_600;

const dot = (
  weights: Partial<Record<string, number>> | undefined,
  values: Record<string, number>
): number => {
  if (!weights) return 0;
  let total = 0;
  let count = 0;
  for (const key of Object.keys(weights)) {
    const weight = weights[key] ?? 0;
    const value = values[key] ?? 0;
    // A negative weight means "this story wants the drive low".
    total += weight >= 0 ? weight * value : -weight * (1 - value);
    count += Math.abs(weight);
  }
  return count === 0 ? 0 : total / count;
};

/** Hard gate: requirements that are simply not met remove the candidate. */
export function isEligible(def: StoryDef, ctx: ScoringContext): boolean {
  const requires = def.requires;
  if (requires) {
    if (requires.events) {
      let matched = false;
      for (const id of requires.events) {
        if (ctx.liveEvents.includes(id)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    if (requires.escalation !== undefined && Math.min(ctx.escalation, def.id.startsWith("WALL_") ? 4 : 5) !== requires.escalation) {
      return false;
    }
    if (requires.minDrive) {
      for (const key of Object.keys(requires.minDrive) as (keyof Drives)[]) {
        if (ctx.drives[key] < (requires.minDrive[key] ?? 0)) return false;
      }
    }
    if (requires.maxDrive) {
      for (const key of Object.keys(requires.maxDrive) as (keyof Drives)[]) {
        if (ctx.drives[key] > (requires.maxDrive[key] ?? 1)) return false;
      }
    }
    if (requires.minValence !== undefined && ctx.emotion.valence < requires.minValence)
      return false;
    if (requires.maxValence !== undefined && ctx.emotion.valence > requires.maxValence)
      return false;
    if (requires.minArousal !== undefined && ctx.emotion.arousal < requires.minArousal)
      return false;
    if (requires.maxArousal !== undefined && ctx.emotion.arousal > requires.maxArousal)
      return false;
    if (
      requires.minConfidence !== undefined &&
      ctx.emotion.confidence < requires.minConfidence
    )
      return false;
    if (
      requires.maxConfidence !== undefined &&
      ctx.emotion.confidence > requires.maxConfidence
    )
      return false;
  }
  // Both the story's own cooldown and its tier's global floor must be clear.
  if (ctx.memory.cooldownRemaining(def.id, ctx.nowMs) > 0) return false;
  if (
    def.rarity !== "COMMON" &&
    ctx.memory.msSinceTier(def.rarity, ctx.nowMs) < RARITY_COOLDOWN_MS[def.rarity]
  ) {
    return false;
  }
  if (def.silhouette && ctx.memory.silhouetteRecent(def.silhouette, 3)) return false;
  if (def.mouthFamily && ctx.memory.mouthFamilyRecent(def.mouthFamily, 1)) return false;
  if (ctx.memory.storyRecency(def.id) === 0) return false;
  if (ctx.memory.storyRecency(def.id) >= 0 && ctx.memory.storyRecency(def.id) < 4 && def.signature) {
    return false;
  }
  return true;
}

export function scoreStory(def: StoryDef, ctx: ScoringContext): CandidateScore {
  const eligible = isEligible(def, ctx);

  // Context: how directly the live events asked for this story.
  let context = 0;
  if (def.requires?.events) {
    for (const id of def.requires.events) {
      const index = ctx.liveEvents.indexOf(id);
      if (index >= 0) {
        context = Math.max(context, 1 - index * 0.15);
      }
    }
  } else if (ctx.liveEvents.length === 0) {
    // Nothing is happening, which is exactly when autonomous stories belong.
    context = 0.45;
  } else {
    context = 0.12;
  }

  const drive = dot(def.driveAffinity, ctx.drives as unknown as Record<string, number>);
  const trait = dot(
    def.traitAffinity,
    ctx.personality as unknown as Record<string, number>
  );
  const emotion = def.emotion ? 1 - emotionDistance(ctx.emotion, def.emotion) : 0.45;

  // Novelty: a story nobody has seen in a while is worth more.
  const recency = ctx.memory.storyRecency(def.id);
  const novelty = recency < 0 ? 0.5 : clamp01(recency / 14) * 0.5;

  // Spatial pressure. In V2 this term was both too weak to compete with the
  // mood terms and biased toward CENTER, so Cherri parked in the middle and
  // only ever bounced out and straight back. It is now scaled by the urge, and
  // centre has lost its blanket advantage.
  const curZone = ctx.memory.currentZone;
  const timeInCurZone = ctx.memory.timeInZone(ctx.nowMs);
  const urge = ctx.spatialUrge;

  // Where this story would actually put him: its authored destination, the
  // zone the explore path committed to, or simply where he already is.
  const dest: BlobDestination = effectiveDestination(def, curZone, ctx.exploreTarget);

  let spatialBonus = 0;
  // Micro-life, reflexes, and placeless stories are local acting: they play
  // wherever he stands, so spatial pressure neither rewards nor punishes them.
  // Pressure to relocate belongs to the urge and the explore path, not to a
  // blink deciding it would rather happen in the middle of the screen.
  const localActing =
    def.category === "MICRO" ||
    def.requires?.events !== undefined ||
    (isPlaceless(def) && ctx.exploreTarget === undefined);

  if (!localActing) {
    if (dest !== curZone) {
      // Residence pressure: the longer he has been parked, the more any
      // relocation is worth.
      const residence = clamp01((timeInCurZone - 2_500) / 8_000);
      spatialBonus += (0.3 + residence * 0.55) * (0.55 + urge * 1.65);

      // Novelty of the destination itself, so he uses all six outer zones
      // rather than wearing a groove between two of them.
      const zoneRec = ctx.memory.zoneRecency(dest);
      if (zoneRec < 0) {
        spatialBonus += 0.3 * (0.5 + urge);
      } else {
        // Recently used zones are actively discouraged, not merely unrewarded.
        // Otherwise the left/right-heavy catalogue wears a groove between two
        // zones and the diagonals never get used.
        spatialBonus += clamp01(zoneRec / 6) * 0.34 - (1 - clamp01(zoneRec / 4)) * 0.4;
      }

      // Never bounce straight back to the zone he just left.
      if (dest === ctx.memory.previousZone) spatialBonus -= 0.45 + urge * 0.55;

      // Centre is a place he can rest, not a home he must return to.
      if (dest === "CENTER") spatialBonus -= urge * 0.85;
    } else {
      // Staying is free for a few seconds, then it costs — increasingly so
      // once the urge has built.
      const overstay = clamp01((timeInCurZone - 3_000) / 7_000);
      spatialBonus -= (0.1 + overstay * 0.55) * (0.4 + urge * 1.6);
    }

    // The deliberate explore path has already decided where he is going;
    // stories that can take him there win the round.
    if (ctx.exploreTarget !== undefined) {
      if (dest === ctx.exploreTarget) spatialBonus += 0.55 + urge * 0.5;
      else spatialBonus -= 0.7;
    }
  }

  // Penalties. Repetition covers the story, its category, and its destination,
  // which is what stops "he keeps drifting left" from ever emerging.
  let penalty = 0;
  if (recency >= 0) penalty += (1 - clamp01(recency / 10)) * 1.4;
  const categoryRecency = ctx.memory.categoryRecency(def.category);
  if (categoryRecency >= 0 && categoryRecency < 3) penalty += (3 - categoryRecency) * 0.13;
  const destinationRecency = ctx.memory.destinationRecency(def.destination);
  if (destinationRecency >= 0 && destinationRecency < 2 && dest !== "CENTER") {
    penalty += 0.25;
  }
  if (def.mouthFamily && ctx.memory.mouthFamilyRecent(def.mouthFamily, 2)) {
    penalty += 0.55;
  }

  // Rarity "due" bonus. Once a tier's global gate has expired, its stories
  // climb steadily into contention. This is what lets a special ever win
  // against fifty-nine well-fitting common ones without making it frequent.
  let due = 0;
  if (def.rarity !== "COMMON") {
    const floor = RARITY_COOLDOWN_MS[def.rarity];
    const since = ctx.memory.msSinceTier(def.rarity, ctx.nowMs);
    const over = clamp01((since - floor) / floor);
    due = over * DUE_BONUS[def.rarity];
  }

  const base =
    context * 1.25 +
    drive * 1.05 +
    emotion * 0.7 +
    trait * 0.55 +
    novelty +
    // Weighted up: movement now competes with mood rather than decorating it.
    spatialBonus * 1.55 +
    due;
  const score = eligible
    ? Math.max(0, (base - penalty) * RARITY_WEIGHT[def.rarity])
    : 0;

  return {
    id: def.id,
    category: def.category,
    rarity: def.rarity,
    score,
    context,
    drive,
    emotion,
    trait,
    novelty,
    penalty,
    eligible,
  };
}

/**
 * Weighted pick across the top candidates. Never the maximum every time — the
 * whole point is plausible variation — but the tail is cut so the choice stays
 * defensible.
 */
export function weightedPick(
  candidates: readonly CandidateScore[],
  roll: number,
  poolSize = 6
): CandidateScore | null {
  const viable = candidates.filter((entry) => entry.eligible && entry.score > 0);
  if (viable.length === 0) return null;
  const sorted = [...viable].sort((a, b) => b.score - a.score);
  const pool = sorted.slice(0, Math.min(poolSize, sorted.length));
  // Squaring sharpens the distribution: the best candidate is favoured without
  // the others becoming unreachable.
  let total = 0;
  for (const entry of pool) total += entry.score * entry.score;
  if (total <= 0) return pool[0];
  let target = clamp(roll, 0, 0.999999) * total;
  for (const entry of pool) {
    target -= entry.score * entry.score;
    if (target <= 0) return entry;
  }
  return pool[pool.length - 1];
}
