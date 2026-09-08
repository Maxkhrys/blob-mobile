/**
 * Authoring helpers for the story catalogue.
 *
 * Stories are data, not code paths. Nothing in the director branches on a
 * story id, so adding a performance means adding one record here — never
 * touching the selection or execution layers.
 */

import type { BlobDestination, BlobIntention } from "../../blobMind";
import type {
  Drives,
  Emotion,
  Personality,
  FacingIntent,
  MovementMode,
  MovementProfile,
  PerformancePhase,
  Rarity,
  ReturnPolicy,
  StoryBeat,
  StoryCategory,
  StoryDef,
  StoryRequirements,
} from "../types";

type BeatCue = Omit<StoryBeat, "phase" | "at">;

/** One beat: which phase it belongs to, when it fires, what it cues. */
export const b = (
  phase: PerformancePhase,
  at: number,
  cue: BeatCue = {}
): StoryBeat => ({ phase, at, ...cue });

const DEFAULT_INTENTION: Record<StoryCategory, BlobIntention> = {
  MICRO: "REST",
  IDLE: "REST",
  CURIOUS: "INSPECT",
  HAPPY: "PLAY",
  PLAYFUL: "PLAY",
  SHY: "WATCH",
  AFFECTIONATE: "WATCH",
  SLEEPY: "REST",
  MISCHIEF: "PLAY",
  SURPRISED: "RECOVER",
  ANNOYED: "RECOVER",
  RARE: "EXPLORE",
  INTERACTION: "WATCH",
};

export interface StoryInput {
  id: string;
  category: StoryCategory;
  rarity?: Rarity;
  intention?: BlobIntention;
  dest?: BlobDestination;
  /** Total performance length. Defaults to the last beat plus a settle tail. */
  duration?: number;
  cooldown?: number;
  priority?: number;
  interruptible?: boolean;
  requires?: StoryRequirements;
  drives?: Partial<Drives>;
  traits?: Partial<Personality>;
  emotion?: Partial<Emotion>;
  note?: string;
  mode?: MovementMode;
  profile?: MovementProfile;
  returnPolicy?: ReturnPolicy;
  facing?: FacingIntent;
  holdFacing?: boolean;
  beats: StoryBeat[];
  signature?: boolean;
  silhouette?: string;
  mouthFamily?: string;
  actingTags?: readonly string[];
  tintR?: number;
  tintG?: number;
  tintB?: number;
  tintAmount?: number;
}

export function story(input: StoryInput): StoryDef {
  const beats = [...input.beats].sort((a, c) => a.at - c.at);
  const last = beats.length > 0 ? beats[beats.length - 1].at : 0;
  return {
    id: input.id,
    category: input.category,
    rarity: input.rarity ?? "COMMON",
    intention: input.intention ?? DEFAULT_INTENTION[input.category],
    destination: input.dest ?? "CENTER",
    durationMs: input.duration ?? last + 900,
    cooldownMs: input.cooldown ?? (input.category === "MICRO" ? 3_500 : 14_000),
    priority: input.priority ?? (input.category === "MICRO" ? 2 : 10),
    interruptible: input.interruptible ?? true,
    requires: input.requires,
    driveAffinity: input.drives,
    traitAffinity: input.traits,
    emotion: input.emotion,
    beats,
    note: input.note,
    movementMode: input.mode,
    movementProfile: input.profile,
    returnPolicy: input.returnPolicy,
    facing: input.facing,
    holdFacing: input.holdFacing,
    signature: input.signature,
    silhouette: input.silhouette,
    mouthFamily: input.mouthFamily,
    actingTags: input.actingTags,
    tintR: input.tintR,
    tintG: input.tintG,
    tintB: input.tintB,
    tintAmount: input.tintAmount,
  };
}

/** Counts the distinct phases a story actually uses, for the lab readout. */
export function phaseCount(def: StoryDef): number {
  const seen = new Set<PerformancePhase>();
  for (const beat of def.beats) seen.add(beat.phase);
  return seen.size;
}
