/**
 * Event intake and repeat escalation.
 *
 * The interesting part is escalation: poking Cherri five times in a row should
 * not produce the same reaction five times. A chain counter per event family
 * lets the catalogue author "poke 1 notices, poke 4 is cheeky", and the chain
 * decays on its own so the next visit starts from curiosity again.
 */

import { clamp } from "./rng";
import type { MindEvent, MindEventId } from "./types";

/** Events that belong to the same escalating conversation. */
export type EscalationFamily = "POKE" | "WALL" | "GRAB" | "DRAG" | "NONE";

const FAMILY: Partial<Record<MindEventId, EscalationFamily>> = {
  TOUCH_TAP: "POKE",
  TOUCH_DOUBLE_TAP: "POKE",
  RAPID_POKES: "POKE",
  WALL_IMPACT: "WALL",
  WALL_PRESS: "WALL",
  GRAB_START: "GRAB",
  GRAB_HOLD: "GRAB",
  DRAG_FAST: "DRAG",
  FLICK: "DRAG",
};

/** A chain that goes quiet for this long is over. */
const CHAIN_RESET_MS = 4_200;
const MAX_STEP = 6;

interface Chain {
  step: number;
  lastAtMs: number;
  /** Gentleness of the chain so far, 0 rough → 1 gentle. */
  gentleness: number;
}

export class EscalationTracker {
  private readonly chains = new Map<EscalationFamily, Chain>();

  reset() {
    this.chains.clear();
  }

  familyOf(id: MindEventId): EscalationFamily {
    return FAMILY[id] ?? "NONE";
  }

  /** Records the event and returns the 1-based step in its chain. */
  register(event: MindEvent, nowMs: number): number {
    const family = this.familyOf(event.id);
    if (family === "NONE") return 0;
    const chain = this.chains.get(family);
    const gentle = 1 - clamp(event.strength, 0, 1);
    if (!chain || nowMs - chain.lastAtMs > CHAIN_RESET_MS) {
      this.chains.set(family, { step: 1, lastAtMs: nowMs, gentleness: gentle });
      return 1;
    }
    chain.step = Math.min(MAX_STEP, chain.step + 1);
    chain.lastAtMs = nowMs;
    // A rolling average: one hard yank inside a gentle session should not
    // instantly reclassify the whole session as rough handling.
    chain.gentleness = chain.gentleness * 0.65 + gentle * 0.35;
    return chain.step;
  }

  step(family: EscalationFamily, nowMs: number): number {
    const chain = this.chains.get(family);
    if (!chain || nowMs - chain.lastAtMs > CHAIN_RESET_MS) return 0;
    return chain.step;
  }

  /** Highest live chain step across every family. */
  peak(nowMs: number): number {
    let peak = 0;
    this.chains.forEach((chain, family) => {
      const step = this.step(family, nowMs);
      if (step > peak) peak = step;
    });
    return peak;
  }

  gentleness(family: EscalationFamily): number {
    return this.chains.get(family)?.gentleness ?? 0.5;
  }

  /** Drops chains that have gone quiet, so the map stays tiny. */
  prune(nowMs: number) {
    this.chains.forEach((chain, family) => {
      if (nowMs - chain.lastAtMs > CHAIN_RESET_MS * 4) this.chains.delete(family);
    });
  }
}

/** Idle thresholds the director converts into IDLE_* events. */
export const IDLE_THRESHOLDS: readonly { id: MindEventId; ms: number }[] = [
  { id: "IDLE_SHORT", ms: 30_000 },
  { id: "IDLE_MEDIUM", ms: 120_000 },
  { id: "IDLE_LONG", ms: 300_000 },
] as const;
