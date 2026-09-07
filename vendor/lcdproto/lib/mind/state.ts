/**
 * Drive state and its drift. Drives are the slow half of the mind: they move
 * over tens of seconds, never per frame, so nothing here reads as oscillation.
 *
 * Update cost is eleven scalar lerps per decision tick. There is no allocation
 * in the hot path — the same object is mutated in place.
 */

import { approach, clamp01 } from "./rng";
import type { Drives, MindEvent, MindEventId, Personality } from "./types";

/** Where each drive settles when nothing is happening. */
export interface DriveRest {
  target: number;
  /** How quickly it returns, in Hz. Small values are slow personality drift. */
  rateHz: number;
}

const REST: Record<keyof Drives, DriveRest> = {
  energy: { target: 0.62, rateHz: 0.012 },
  curiosity: { target: 0.55, rateHz: 0.03 },
  playfulness: { target: 0.5, rateHz: 0.028 },
  affection: { target: 0.5, rateHz: 0.014 },
  confidence: { target: 0.58, rateHz: 0.02 },
  sleepiness: { target: 0.22, rateHz: 0.01 },
  boredom: { target: 0.2, rateHz: 0.02 },
  attentionNeed: { target: 0.3, rateHz: 0.016 },
  startle: { target: 0, rateHz: 0.5 },
  patience: { target: 0.7, rateHz: 0.04 },
  mischief: { target: 0.35, rateHz: 0.022 },
};

export const createDrives = (personality: Personality): Drives => ({
  energy: 0.66,
  curiosity: personality.curiosity * 0.8,
  playfulness: personality.playfulness * 0.7,
  affection: personality.affection * 0.7,
  confidence: personality.confidence,
  sleepiness: 0.18,
  boredom: 0.16,
  attentionNeed: 0.28,
  startle: 0,
  patience: personality.patience,
  mischief: personality.mischief * 0.7,
});

/**
 * Impulses an event adds to the drives. These are deltas, applied once, then
 * the drift above slowly pulls everything back toward rest.
 */
const EVENT_IMPULSE: Partial<Record<MindEventId, Partial<Drives>>> = {
  TOUCH_TAP: { curiosity: 0.14, boredom: -0.3, attentionNeed: -0.2, playfulness: 0.06 },
  TOUCH_DOUBLE_TAP: { curiosity: 0.2, playfulness: 0.16, boredom: -0.4, attentionNeed: -0.3 },
  GRAB_START: { startle: 0.3, curiosity: 0.16, boredom: -0.45, attentionNeed: -0.35 },
  GRAB_HOLD: { affection: 0.14, startle: -0.2, sleepiness: 0.05, attentionNeed: -0.3 },
  DRAG_SLOW: { affection: 0.06, boredom: -0.2, curiosity: 0.05 },
  DRAG_FAST: { energy: 0.08, playfulness: 0.12, startle: 0.14, patience: -0.06 },
  FLICK: { startle: 0.55, energy: 0.1, confidence: -0.12, patience: -0.1 },
  RELEASE: { startle: -0.15, playfulness: 0.06 },
  WALL_IMPACT: { startle: 0.42, confidence: -0.1, patience: -0.12, energy: -0.04 },
  WALL_PRESS: { patience: -0.1, confidence: -0.06, mischief: 0.05 },
  RAPID_POKES: { patience: -0.22, playfulness: 0.1, mischief: 0.12, boredom: -0.5 },
  IDLE_SHORT: { boredom: 0.06 },
  IDLE_MEDIUM: { boredom: 0.16, curiosity: 0.08, attentionNeed: 0.12 },
  IDLE_LONG: { boredom: 0.24, sleepiness: 0.18, attentionNeed: 0.2, energy: -0.08 },
  USER_RETURNED: { affection: 0.22, playfulness: 0.18, boredom: -0.6, attentionNeed: -0.5, energy: 0.1 },
  STATE_CHANGED: { curiosity: 0.18, boredom: -0.2 },
  NEARBY_DETECTED: { curiosity: 0.24, attentionNeed: -0.1, energy: 0.06 },
  MESSAGE_RECEIVED: { curiosity: 0.3, playfulness: 0.12, boredom: -0.4 },
  NAVIGATION_STARTED: { curiosity: 0.16, energy: 0.08 },
  DRIVER_CONNECTED: { affection: 0.2, confidence: 0.1, boredom: -0.3 },
  FRIEND_NEARBY: { affection: 0.24, playfulness: 0.2, curiosity: 0.18 },
  MUSIC_PLAYING: { playfulness: 0.22, energy: 0.12, boredom: -0.35 },
};

/** Approaches a ceiling; never pushes a drive past it. */
const push = (value: number, ceiling: number, delta: number) =>
  value >= ceiling ? value : Math.min(ceiling, value + delta);

export class DriveState {
  readonly drives: Drives;

  constructor(private personality: Personality) {
    this.drives = createDrives(personality);
  }

  reset(personality = this.personality) {
    this.personality = personality;
    Object.assign(this.drives, createDrives(personality));
  }

  setPersonality(personality: Personality) {
    this.personality = personality;
  }

  /** Slow drift toward rest, plus the standing pressures of doing nothing. */
  drift(dtMs: number, msSinceInteraction: number) {
    const d = this.drives;
    for (const key of Object.keys(REST) as (keyof Drives)[]) {
      const rest = REST[key];
      // Traits pull the resting point: a curious character idles curious.
      const target = this.restTarget(key, rest.target);
      d[key] = approach(d[key], target, rest.rateHz, dtMs);
    }
    // Standing pressure from being left alone. Each pressure has a ceiling:
    // without one, a quiet half hour pinned boredom and sleepiness at 1.0 and
    // the catalogue collapsed to the two categories that like those values.
    const quietSeconds = msSinceInteraction / 1000;
    if (quietSeconds > 12) {
      const pressure = Math.min(1, (quietSeconds - 12) / 180);
      d.boredom = push(d.boredom, 0.82, pressure * dtMs * 0.000018);
      d.attentionNeed = push(d.attentionNeed, 0.74, pressure * dtMs * 0.000012);
      d.sleepiness = push(d.sleepiness, 0.86, pressure * dtMs * 0.0000085);
      d.energy = clamp01(Math.max(0.16, d.energy - pressure * dtMs * 0.0000055));
    }
    for (const key of Object.keys(d) as (keyof Drives)[]) {
      d[key] = clamp01(d[key]);
    }
  }

  private restTarget(key: keyof Drives, base: number) {
    const p = this.personality;
    switch (key) {
      case "curiosity":
        return base * 0.45 + p.curiosity * 0.55;
      case "playfulness":
        return base * 0.45 + p.playfulness * 0.55;
      case "affection":
        return base * 0.5 + p.affection * 0.5;
      case "confidence":
        return base * 0.35 + p.confidence * 0.65;
      case "patience":
        return base * 0.35 + p.patience * 0.65;
      case "mischief":
        return base * 0.5 + p.mischief * 0.5;
      default:
        return base;
    }
  }

  /** Applies one event's impulse. Sensitivity scales how hard it lands. */
  apply(event: MindEvent) {
    const impulse = EVENT_IMPULSE[event.id];
    if (!impulse) return;
    const gain = 0.6 + event.strength * 0.8;
    const sensitivity = 0.55 + this.personality.sensitivity * 0.9;
    for (const key of Object.keys(impulse) as (keyof Drives)[]) {
      const delta = impulse[key] ?? 0;
      // Only the unpleasant half is amplified by sensitivity; a sensitive
      // character is not also twice as delighted by everything.
      const scale = delta < 0 || key === "startle" ? sensitivity : 1;
      this.drives[key] = clamp01(this.drives[key] + delta * gain * scale);
    }
  }

  /**
   * Doing something is its own relief: after a performance he is measurably
   * less bored, and an energetic one wakes him slightly. Without this the
   * drives only ever moved when the user did something.
   */
  relieve(energetic: boolean) {
    const d = this.drives;
    d.boredom = clamp01(d.boredom - 0.11);
    d.attentionNeed = clamp01(d.attentionNeed - 0.045);
    if (energetic) {
      d.sleepiness = clamp01(d.sleepiness - 0.06);
      d.energy = clamp01(d.energy - 0.02);
    } else {
      d.energy = clamp01(d.energy + 0.012);
    }
  }

  /** Escalating repeats wear patience down faster than the base impulse. */
  applyEscalation(step: number) {
    const wear = Math.min(0.35, step * 0.06);
    this.drives.patience = clamp01(this.drives.patience - wear);
    this.drives.mischief = clamp01(this.drives.mischief + wear * 0.5);
  }

  snapshot(): Drives {
    return { ...this.drives };
  }
}
