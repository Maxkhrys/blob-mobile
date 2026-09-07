/**
 * Cherri Mind V2 — the vocabulary the behavioural brain thinks in.
 *
 * Nothing in this file renders. The mind decides WHAT Cherri wants to do; the
 * BehaviourController remains the execution layer that decides HOW. Every type
 * here is deliberately flat and scalar so the same model ports to an ESP32-S3
 * without dynamic allocation, JSON parsing, or floating graph structures.
 */

import type {
  BodyBehaviour,
  ExpressionBehaviour,
  GazeBehaviour,
  MouthBehaviour,
  SpecialBehaviour,
} from "../behaviours/types";
import type { BlobDestination, BlobIntention } from "../blobMind";

/* ------------------------------------------------------------------ drives */

/** Slow internal state. Personality-level, not frame-level. */
export interface Drives {
  energy: number;
  curiosity: number;
  playfulness: number;
  affection: number;
  confidence: number;
  sleepiness: number;
  boredom: number;
  attentionNeed: number;
  startle: number;
  patience: number;
  mischief: number;
}

export type DriveId = keyof Drives;

export const DRIVE_IDS: readonly DriveId[] = [
  "energy",
  "curiosity",
  "playfulness",
  "affection",
  "confidence",
  "sleepiness",
  "boredom",
  "attentionNeed",
  "startle",
  "patience",
  "mischief",
] as const;

/* ----------------------------------------------------------------- emotion */

/**
 * Compact emotional space. Named moods are read out of these dimensions
 * rather than being the whole brain.
 */
export interface Emotion {
  /** -1 sad → +1 happy. */
  valence: number;
  /** 0 sleepy → 1 excited. */
  arousal: number;
  /** 0 shy → 1 bold. */
  confidence: number;
  /** 0 withdrawn → 1 affectionate. */
  social: number;
}

/* ------------------------------------------------------------- personality */

/** Fixed traits. Traits bias scoring; drives are the state that moves. */
export interface Personality {
  curiosity: number;
  playfulness: number;
  affection: number;
  confidence: number;
  patience: number;
  mischief: number;
  sensitivity: number;
}

export type TraitId = keyof Personality;

export const TRAIT_IDS: readonly TraitId[] = [
  "curiosity",
  "playfulness",
  "affection",
  "confidence",
  "patience",
  "mischief",
  "sensitivity",
] as const;

/* ------------------------------------------------------------------ events */

/**
 * Context the mind reacts to. Physical events exist today; the social and
 * connectivity events are the future-facing slots so a phone, a driver link,
 * or a proximity radio can feed the same pipeline without a redesign.
 */
export type MindEventId =
  | "TOUCH_TAP"
  | "TOUCH_DOUBLE_TAP"
  | "GRAB_START"
  | "GRAB_HOLD"
  | "DRAG_SLOW"
  | "DRAG_FAST"
  | "FLICK"
  | "RELEASE"
  | "WALL_IMPACT"
  | "WALL_PRESS"
  | "RAPID_POKES"
  | "IDLE_SHORT"
  | "IDLE_MEDIUM"
  | "IDLE_LONG"
  | "USER_RETURNED"
  | "STATE_CHANGED"
  | "NEARBY_DETECTED"
  | "MESSAGE_RECEIVED"
  | "NAVIGATION_STARTED"
  | "DRIVER_CONNECTED"
  | "FRIEND_NEARBY"
  | "MUSIC_PLAYING";

export const MIND_EVENT_IDS: readonly MindEventId[] = [
  "TOUCH_TAP",
  "TOUCH_DOUBLE_TAP",
  "GRAB_START",
  "GRAB_HOLD",
  "DRAG_SLOW",
  "DRAG_FAST",
  "FLICK",
  "RELEASE",
  "WALL_IMPACT",
  "WALL_PRESS",
  "RAPID_POKES",
  "IDLE_SHORT",
  "IDLE_MEDIUM",
  "IDLE_LONG",
  "USER_RETURNED",
  "STATE_CHANGED",
  "NEARBY_DETECTED",
  "MESSAGE_RECEIVED",
  "NAVIGATION_STARTED",
  "DRIVER_CONNECTED",
  "FRIEND_NEARBY",
  "MUSIC_PLAYING",
] as const;

export interface MindEvent {
  id: MindEventId;
  /** 0..1 physical strength where the event has one (impact speed, hold force). */
  strength: number;
  /** -1 left, +1 right, 0 unknown. Keeps reactions on the correct side. */
  direction: number;
}

export const mindEvent = (
  id: MindEventId,
  strength = 0.5,
  direction = 0
): MindEvent => ({ id, strength, direction });

/** Events that are physical enough to deserve a reflex, not a decision. */
export const REFLEX_EVENTS: readonly MindEventId[] = [
  "FLICK",
  "WALL_IMPACT",
  "GRAB_START",
  "RELEASE",
  "TOUCH_TAP",
  "TOUCH_DOUBLE_TAP",
  "RAPID_POKES",
  "WALL_PRESS",
  "GRAB_HOLD",
] as const;

/* ----------------------------------------------------------- story grammar */

export type StoryCategory =
  | "MICRO"
  | "IDLE"
  | "CURIOUS"
  | "HAPPY"
  | "PLAYFUL"
  | "SHY"
  | "AFFECTIONATE"
  | "SLEEPY"
  | "MISCHIEF"
  | "SURPRISED"
  | "ANNOYED"
  | "RARE"
  | "INTERACTION";

export const STORY_CATEGORIES: readonly StoryCategory[] = [
  "MICRO",
  "IDLE",
  "CURIOUS",
  "HAPPY",
  "PLAYFUL",
  "SHY",
  "AFFECTIONATE",
  "SLEEPY",
  "MISCHIEF",
  "SURPRISED",
  "ANNOYED",
  "RARE",
  "INTERACTION",
] as const;

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "SPECIAL";

export const RARITIES: readonly Rarity[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "SPECIAL",
] as const;

/**
 * Base utility weight per tier. Rarity is a bias here, never the mechanism:
 * the actual scarcity comes from RARITY_COOLDOWN_MS below, which is a hard
 * time gate and therefore predictable. Weighting alone, combined with the
 * squared pick, starved the rare tiers entirely.
 */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  COMMON: 1,
  UNCOMMON: 0.97,
  RARE: 0.92,
  SPECIAL: 0.86,
};

/**
 * Minimum gap between ANY two stories of a tier, on top of each story's own
 * cooldown. This is what actually makes rare things rare: with 21 specials
 * authored, per-story cooldowns alone would still fire one every few seconds.
 */
export const RARITY_COOLDOWN_MS: Record<Rarity, number> = {
  COMMON: 6_000,
  UNCOMMON: 20_000,
  RARE: 90_000,
  SPECIAL: 240_000,
};

export type PerformancePhase =
  | "NOTICE"
  | "ANTICIPATION"
  | "ACTION"
  | "REACTION"
  | "RECOVERY";

export const PHASE_ORDER: readonly PerformancePhase[] = [
  "NOTICE",
  "ANTICIPATION",
  "ACTION",
  "REACTION",
  "RECOVERY",
] as const;

/* -------------------------------------------------------- spatial acting */

export type MovementMode =
  | "STAY"
  | "DRIFT"
  | "TRAVEL"
  | "APPROACH"
  | "RETREAT"
  | "PEEK"
  | "DASH"
  | "ORBIT"
  | "RETURN"
  | "FLOAT";

export const MOVEMENT_MODES: readonly MovementMode[] = [
  "STAY",
  "DRIFT",
  "TRAVEL",
  "APPROACH",
  "RETREAT",
  "PEEK",
  "DASH",
  "ORBIT",
  "RETURN",
  "FLOAT",
] as const;

export type MovementProfile =
  | "REST"
  | "EXPLORE"
  | "INSPECT"
  | "PLAY"
  | "SHY"
  | "SLEEPY"
  | "STARTLED"
  | "AFFECTION"
  | "DART"
  | "TIPTOE"
  | "SNEAK"
  | "DRIFT"
  | "FLOAT";

export const MOVEMENT_PROFILES: readonly MovementProfile[] = [
  "REST",
  "EXPLORE",
  "INSPECT",
  "PLAY",
  "SHY",
  "SLEEPY",
  "STARTLED",
  "AFFECTION",
  "DART",
  "TIPTOE",
  "SNEAK",
  "DRIFT",
  "FLOAT",
] as const;

export type ReturnPolicy = "HOLD" | "HOLD_BRIEFLY" | "RETURN" | "TRANSITION" | "BOUNCE";

export const RETURN_POLICIES: readonly ReturnPolicy[] = [
  "HOLD",
  "HOLD_BRIEFLY",
  "RETURN",
  "TRANSITION",
  "BOUNCE",
] as const;

export type MovementEnergy = "LOW" | "NORMAL" | "HIGH";

export type PerformanceStrengthTier =
  | "MICRO"
  | "SMALL"
  | "MEDIUM"
  | "BIG"
  | "SPECIAL";

export type FacingIntent =
  | "FORWARD"
  | "LOOK_LEFT"
  | "LOOK_RIGHT"
  | "LOOK_UP"
  | "LOOK_DOWN"
  | "FACE_TRAVEL"
  | "FACE_TARGET";

export const FACING_INTENTS: readonly FacingIntent[] = [
  "FORWARD",
  "LOOK_LEFT",
  "LOOK_RIGHT",
  "LOOK_UP",
  "LOOK_DOWN",
  "FACE_TRAVEL",
  "FACE_TARGET",
] as const;

export type YawSource = "NEUTRAL" | "VELOCITY" | "STORY" | "GAZE" | "MANUAL";

/**
 * One authored moment inside a performance. Anything omitted simply leaves
 * that channel alone, so a beat can be as small as "the eyes widen".
 */
export interface StoryBeat {
  phase: PerformancePhase;
  /** Offset from the start of the performance, in milliseconds. */
  at: number;
  gaze?: GazeBehaviour;
  expression?: ExpressionBehaviour;
  mouth?: MouthBehaviour;
  body?: BodyBehaviour;
  /** Parametric body phrase from lib/behaviours/primitives.ts. */
  primitive?: PrimitiveId;
  /** -1 left, +1 right for direction-aware primitives. */
  dir?: number;
  /** Amplitude multiplier for the primitive, 0..1.5. */
  amount?: number;
  special?: SpecialBehaviour | "SPIN_360";
  /** Retarget the whole character. */
  destination?: BlobDestination;
  depth?: number;
  /** Force a blink at this beat. */
  blink?: boolean;
  movementMode?: MovementMode;
  movementProfile?: MovementProfile;
  returnPolicy?: ReturnPolicy;
  facing?: FacingIntent;
  holdFacing?: boolean;
}

/** Conditions a story needs before it is even considered. */
export interface StoryRequirements {
  /** Any one of these events must be in the recent window. */
  events?: readonly MindEventId[];
  minDrive?: Partial<Drives>;
  maxDrive?: Partial<Drives>;
  minValence?: number;
  maxValence?: number;
  minArousal?: number;
  maxArousal?: number;
  minConfidence?: number;
  maxConfidence?: number;
  /** Escalation step for repeated-interaction chains, 1-based. */
  escalation?: number;
}

export interface StoryDef {
  id: string;
  category: StoryCategory;
  rarity: Rarity;
  tier?: PerformanceStrengthTier;
  intention: BlobIntention;
  destination: BlobDestination;
  durationMs: number;
  cooldownMs: number;
  /** Higher wins an interrupt contest. Reflexes sit at 80+. */
  priority: number;
  /** False means the story plays out even when something else wants in. */
  interruptible: boolean;
  requires?: StoryRequirements;
  /** Pulls toward the story when the matching drive is high, 0..1 weights. */
  driveAffinity?: Partial<Drives>;
  /** Pulls toward the story when the matching trait is high. */
  traitAffinity?: Partial<Personality>;
  /** Preferred emotional neighbourhood; distance from it costs utility. */
  emotion?: Partial<Emotion>;
  beats: readonly StoryBeat[];
  /** Free text used by the story browser only. */
  note?: string;
  movementMode?: MovementMode;
  movementProfile?: MovementProfile;
  returnPolicy?: ReturnPolicy;
  facing?: FacingIntent;
  holdFacing?: boolean;
}

/* -------------------------------------------------------------- primitives */

export type PrimitiveId =
  | "HOP"
  | "DOUBLE_HOP"
  | "LEAN"
  | "PEEK"
  | "SHRINK"
  | "PUFF"
  | "WOBBLE"
  | "SHIVER"
  | "NOD"
  | "TILT"
  | "DASH"
  | "RECOIL"
  | "BREATHE"
  | "SETTLE"
  | "SWAY"
  | "STUMBLE"
  | "SHAKE_OFF"
  | "BALANCE"
  | "SNEEZE"
  | "HICCUP"
  | "SLUMP"
  | "STRETCH_UP"
  | "SQUISH"
  | "PULSE";

export const PRIMITIVE_IDS: readonly PrimitiveId[] = [
  "HOP",
  "DOUBLE_HOP",
  "LEAN",
  "PEEK",
  "SHRINK",
  "PUFF",
  "WOBBLE",
  "SHIVER",
  "NOD",
  "TILT",
  "DASH",
  "RECOIL",
  "BREATHE",
  "SETTLE",
  "SWAY",
  "STUMBLE",
  "SHAKE_OFF",
  "BALANCE",
  "SNEEZE",
  "HICCUP",
  "SLUMP",
  "STRETCH_UP",
  "SQUISH",
  "PULSE",
] as const;

/* ------------------------------------------------------------------- plans */

/** A resolved, timestamped cue the controller executes verbatim. */
export interface MindCue {
  atMs: number;
  phase: PerformancePhase;
  gaze?: GazeBehaviour;
  expression?: ExpressionBehaviour;
  mouth?: MouthBehaviour;
  body?: BodyBehaviour;
  primitive?: PrimitiveId;
  dir?: number;
  amount?: number;
  special?: SpecialBehaviour | "SPIN_360";
  destination?: BlobDestination;
  depth?: number;
  blink?: boolean;
  movementMode?: MovementMode;
  movementProfile?: MovementProfile;
  returnPolicy?: ReturnPolicy;
  facing?: FacingIntent;
  holdFacing?: boolean;
}

export interface MindPlan {
  storyId: string;
  category: StoryCategory;
  rarity: Rarity;
  intention: BlobIntention;
  destination: BlobDestination;
  durationMs: number;
  priority: number;
  interruptible: boolean;
  phaseCount: number;
  cues: readonly MindCue[];
  movementMode: MovementMode;
  movementProfile: MovementProfile;
  returnPolicy: ReturnPolicy;
  fromZone: BlobDestination;
  toZone: BlobDestination;
  facing?: FacingIntent;
  holdFacing?: boolean;
}

/* --------------------------------------------------------- high-level AI IO */

/**
 * The only surface a future phone or cloud model is allowed to drive. It
 * requests an intent; the local catalogue still owns every frame.
 */
export type MindIntent =
  | "CHEER_USER_UP"
  | "CELEBRATE"
  | "WELCOME_USER"
  | "ACT_CURIOUS"
  | "CALM_DOWN"
  | "SHOW_SLEEPY"
  | "REACT_TO_MESSAGE"
  | "GET_EXCITED"
  | "SHOW_AFFECTION"
  | "NOTICE_FRIEND";

export const MIND_INTENTS: readonly MindIntent[] = [
  "CHEER_USER_UP",
  "CELEBRATE",
  "WELCOME_USER",
  "ACT_CURIOUS",
  "CALM_DOWN",
  "SHOW_SLEEPY",
  "REACT_TO_MESSAGE",
  "GET_EXCITED",
  "SHOW_AFFECTION",
  "NOTICE_FRIEND",
] as const;

/* --------------------------------------------------------------- telemetry */

export interface CandidateScore {
  id: string;
  category: StoryCategory;
  rarity: Rarity;
  score: number;
  /** Why it scored what it scored — developer tooling only. */
  context: number;
  drive: number;
  emotion: number;
  trait: number;
  novelty: number;
  penalty: number;
  eligible: boolean;
}

export interface MindTelemetry {
  seed: number;
  clockMs: number;
  drives: Drives;
  emotion: Emotion;
  personality: Personality;
  mood: string;
  storyId: string;
  category: StoryCategory | "NONE";
  phase: PerformancePhase | "NONE";
  phaseIndex: number;
  phaseCount: number;
  intention: BlobIntention;
  nextDecisionMs: number;
  recentStories: readonly string[];
  recentEvents: readonly MindEventId[];
  candidates: readonly CandidateScore[];
  cooldowns: readonly { id: string; remainingMs: number }[];
  msSinceInteraction: number;
  escalation: number;
  currentZone: BlobDestination;
  targetZone: BlobDestination;
  previousZone: BlobDestination;
  recentZones: readonly BlobDestination[];
  timeInZoneMs: number;
  spatialUrge?: number;
  spatialUrgeTarget?: number;
  msSinceWorldMove?: number;
  movementEnergy?: MovementEnergy;
  nextMovementBias?: string;
  movementMode: MovementMode;
  movementProgress: number;
  movementProfile: MovementProfile;
  returnPolicy: ReturnPolicy;
  episode: string;
  episodeRemainingMs: number;
  targetX: number;
  targetY: number;
  finalYaw?: number;
  directorOwner: string;
  travelYawTarget: number;
  travelPitchTarget: number;
  worldX: number;
  worldY: number;
  yawSource: YawSource;
  facingIntent: FacingIntent;
}
