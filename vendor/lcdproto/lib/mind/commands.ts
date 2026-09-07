/**
 * Mind Lab command channel.
 *
 * The simulator's controls live in one React tree and the mind lives inside a
 * requestAnimationFrame loop in another. Passing a nonce-stamped command down
 * keeps that boundary one-way: the panel never holds a reference to the
 * director, and a repeated click still fires because the nonce changed.
 */

import type { BlobDestination } from "../blobMind";
import type { MindEvent, MindEventId, MindIntent, MovementEnergy } from "./types";

export type MindCommand =
  | { kind: "EVENT"; event: MindEvent; nonce: number }
  | { kind: "MOOD"; mood: string; nonce: number }
  | { kind: "PLAY"; storyId: string; nonce: number }
  | { kind: "INTENT"; intent: MindIntent; nonce: number }
  | { kind: "SEED"; seed: number; nonce: number }
  | { kind: "THINK"; nonce: number }
  | { kind: "IDLE"; ms: number; nonce: number }
  | { kind: "FORCE_ZONE"; zone: BlobDestination; nonce: number }
  | { kind: "FORCE_WANDER"; nonce: number }
  | { kind: "FORCE_NEXT_MOVE"; nonce: number }
  | { kind: "FORCE_EXPLORE"; nonce: number }
  | { kind: "RESET_URGE"; nonce: number }
  | { kind: "MOVEMENT_ENERGY"; energy: MovementEnergy; nonce: number }
  | { kind: "RETURN_CENTER"; nonce: number }
  | { kind: "RESET_SPATIAL"; nonce: number }
  | { kind: "DEMO_60S"; nonce: number };

export const LAB_ZONES: readonly { id: BlobDestination; label: string }[] = [
  { id: "CENTER", label: "Center" },
  { id: "LEFT", label: "Left" },
  { id: "RIGHT", label: "Right" },
  { id: "UP_LEFT", label: "Up Left" },
  { id: "UP_RIGHT", label: "Up Right" },
  { id: "DOWN_LEFT", label: "Down Left" },
  { id: "DOWN_RIGHT", label: "Down Right" },
];

/** Omit that distributes over the union, so each variant keeps its own shape. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A command before the dispatcher stamps it with a nonce. */
export type MindCommandInput = DistributiveOmit<MindCommand, "nonce">;

/** Buttons the lab offers, in the order they are shown. */
export const LAB_MOODS: readonly string[] = [
  "IDLE",
  "BORED",
  "PLAYFUL",
  "SLEEPY",
  "SHY",
  "AFFECTIONATE",
  "STARTLED",
  "ANNOYED",
  "CURIOUS",
  "MISCHIEF",
];

export const LAB_EVENTS: readonly { id: MindEventId; label: string; strength: number }[] = [
  { id: "TOUCH_TAP", label: "Tap", strength: 0.5 },
  { id: "RAPID_POKES", label: "Rapid poke", strength: 0.7 },
  { id: "GRAB_START", label: "Grab", strength: 0.6 },
  { id: "GRAB_HOLD", label: "Long hold", strength: 0.9 },
  { id: "DRAG_SLOW", label: "Slow drag", strength: 0.3 },
  { id: "DRAG_FAST", label: "Fast drag", strength: 0.8 },
  { id: "FLICK", label: "Flick", strength: 1 },
  { id: "WALL_IMPACT", label: "Wall impact", strength: 0.9 },
  { id: "WALL_PRESS", label: "Wall press", strength: 0.6 },
  { id: "RELEASE", label: "Release", strength: 0.5 },
  { id: "USER_RETURNED", label: "User returned", strength: 0.8 },
];

/** Simulated absences, so idle behaviour can be inspected without waiting. */
export const LAB_IDLE_JUMPS: readonly { label: string; ms: number }[] = [
  { label: "Idle 30s", ms: 30_000 },
  { label: "Idle 2m", ms: 120_000 },
  { label: "Idle 5m", ms: 300_000 },
];
