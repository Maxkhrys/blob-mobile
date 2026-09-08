import { compilePerformance } from "./performance";
import { chooseEpisode, EPISODE_CATEGORIES, type Episode } from "./episode";
import {
  chooseDestination,
  effectiveDestination,
  EXPLORE_THRESHOLD,
  isPlaceless,
  isRetargetable,
  movementBiasLabel,
  MOVEMENT_ENERGY_GAIN,
  reasonAffinity,
  SpatialUrge,
  zoneDistance,
  type MovementIntent,
} from "./spatial";
/**
 * Cherri Mind V4 — the director.
 *
 * Responsibilities, in order of how often they run:
 *   1. accept events at any time (cheap: they go into a bounded queue),
 *   2. tick the drives, emotion, and spatial urge at a low fixed rate (default 8 Hz),
 *   3. decide which authored performance to hand to the execution layer.
 *
 * It never touches a pose, a spring, or a frame. Everything it produces is a
 * MindPlan: a list of timestamped cues the BehaviourController runs.
 */

import type { BlobDestination } from "../blobMind";
import { STORIES_BY_CATEGORY, MICRO_LIFE_STORIES, PERFORMANCE_STORIES, STORY_BY_ID } from "./catalogue";
import { deriveEmotion, emotionLabel, moodFromEmotion, MOOD_FORCE, NEUTRAL_EMOTION } from "./emotion";
import { EscalationTracker, IDLE_THRESHOLDS } from "./events";
import { INTENT_MAP } from "./intents";
import { MindMemory } from "./memory";
import { CHERRI_PERSONALITY } from "./personality";
import { clamp, clamp01, SeededRandom } from "./rng";
import { EVENT_WINDOW_MS, scoreStory, weightedPick, type ScoringContext } from "./scoring";
import { DriveState } from "./state";
import {
  RARITY_COOLDOWN_MS,
  type ActingCycle,
  type ActingIntensity,
  type CandidateScore,
  type Emotion,
  type MindEvent,
  type MindEventId,
  type MindIntent,
  type MindPlan,
  type MindTelemetry,
  type MovementEnergy,
  type Personality,
  type PerformancePhase,
  type ReturnPolicy,
  type StoryBeat,
  type StoryDef,
} from "./types";
import {
  CYCLE_QUIET,
  DEFAULT_ACTING_CYCLE,
  DEFAULT_ACTING_INTENSITY,
  INTENSITY_SCALE,
  MOOD_OPENERS,
  OPENING_POOL,
  SHOWCASE_SEQUENCE,
  CYCLE_OPENING,
  CYCLE_EPISODE,
  cycleWeight,
  cycleTagBoost,
} from "./acting";

export const DEFAULT_MIND_SEED = 0xc4e881;

/** The decision rate. Animation still runs at 60 fps; this does not. */
export const DECISION_HZ = 8;
const DECISION_STEP_MS = 1000 / DECISION_HZ;

/** Events are drained each decision tick, so this only has to absorb a burst. */
const EVENT_QUEUE_CAPACITY = 12;

export interface MindOptions {
  seed?: number;
  personality?: Personality;
}

export class CherriMind {
  private rng: SeededRandom;
  private personality: Personality;
  private readonly driveState: DriveState;
  private readonly memory = new MindMemory();
  private readonly escalation = new EscalationTracker();
  private readonly emotionState: Emotion = { ...NEUTRAL_EMOTION };

  private clock = 0;
  private accumulator = 0;
  private seedValue: number;

  /** Bounded event intake. Overflow drops the oldest, never grows. */
  private readonly queue: MindEvent[] = [];
  /** Events still inside the reaction window, newest first. */
  private live: { id: MindEventId; atMs: number }[] = [];

  private currentPlan: MindPlan | null = null;
  private planStartedAt = 0;
  private pendingPlan: MindPlan | null = null;

  private nextDecisionAt = 600;
  private nextMicroAt = 1_800;
  private nextSignatureAt = 8_000;
  private actingCycle: ActingCycle = DEFAULT_ACTING_CYCLE;
  private actingIntensity: ActingIntensity = DEFAULT_ACTING_INTENSITY;
  private openingDone = false;
  private showcaseIndex = 0;
  private episode: Episode = "CURIOUS";
  private episodeUntil = 40_000;
  private lastEventDirection = 0;
  private held = false;
  private forcedZone: BlobDestination | null = null;
  private idleStage = 0;

  private intentRequest: MindIntent | null = null;
  private intentUntil = 0;
  private forcedStoryId: string | null = null;

  /** Spatial urge tracking and pacing. */
  private readonly urge = new SpatialUrge();
  private movementEnergy: MovementEnergy = "NORMAL";
  private exploreIntent: MovementIntent | null = null;

  /** Developer telemetry only; rebuilt on each real decision. */
  private lastCandidates: CandidateScore[] = [];

  constructor(options: MindOptions = {}) {
    this.seedValue = options.seed ?? DEFAULT_MIND_SEED;
    this.personality = options.personality ?? CHERRI_PERSONALITY;
    this.rng = new SeededRandom(this.seedValue);
    this.driveState = new DriveState(this.personality);
  }

  /* ------------------------------------------------------------- lifecycle */

  reset(seed = this.seedValue, personality = this.personality) {
    this.seedValue = seed;
    this.personality = personality;
    this.rng = new SeededRandom(seed);
    this.driveState.reset(personality);
    this.memory.reset();
    this.escalation.reset();
    this.urge.reset();
    this.movementEnergy = "NORMAL";
    this.exploreIntent = null;
    Object.assign(this.emotionState, NEUTRAL_EMOTION);
    this.clock = 0;
    this.accumulator = 0;
    this.queue.length = 0;
    this.live = [];
    this.currentPlan = null;
    this.pendingPlan = null;
    this.planStartedAt = 0;
    this.nextDecisionAt = 600;
    this.nextMicroAt = 1_800;
    this.nextSignatureAt = 8_000;
    this.openingDone = false;
    this.showcaseIndex = this.actingCycle === "SHOWCASE" ? 0 : this.showcaseIndex;
    this.episode = "CURIOUS";
    this.episodeUntil = 40_000;
    this.forcedZone = null;
    this.lastEventDirection = 0;
    this.held = false;
    this.idleStage = 0;
    this.intentRequest = null;
    this.intentUntil = 0;
    this.forcedStoryId = null;
    this.lastCandidates = [];
  }

  get seed() {
    return this.seedValue;
  }

  setSeed(seed: number) {
    this.reset(seed, this.personality);
  }

  setPersonality(personality: Personality) {
    this.personality = personality;
    this.driveState.setPersonality(personality);
  }

  /* ----------------------------------------------------------------- input */

  /** Events may arrive on any frame; they are processed on the next tick. */
  push(event: MindEvent) {
    if (this.queue.length >= EVENT_QUEUE_CAPACITY) this.queue.shift();
    this.queue.push(event);
  }

  /** The high-level AI door. It requests a mood; the catalogue still decides. */
  request(intent: MindIntent) {
    const mapping = INTENT_MAP[intent];
    if (!mapping) return;
    this.intentRequest = intent;
    this.intentUntil = this.clock + mapping.holdMs;
    for (const key of Object.keys(mapping.drives)) {
      const value = mapping.drives[key];
      if (value === undefined) continue;
      const drives = this.driveState.drives as unknown as Record<string, number>;
      if (key in drives) drives[key] = clamp01(value);
    }
    // Act on it now rather than waiting out the current quiet gap.
    this.nextDecisionAt = Math.min(this.nextDecisionAt, this.clock + 120);
  }

  /** Mind Lab: push the drives straight to a named mood. */
  forceMood(mood: string) {
    const preset = MOOD_FORCE[mood];
    if (!preset) return;
    this.driveState.reset(this.personality);
    const drives = this.driveState.drives as unknown as Record<string, number>;
    for (const key of Object.keys(preset)) {
      const value = (preset as Record<string, number>)[key];
      if (value !== undefined && key in drives) drives[key] = clamp01(value);
    }
    this.episode = mood as Episode;
    this.episodeUntil = this.clock + 60_000;
    const opener = MOOD_OPENERS[mood];
    if (opener && STORY_BY_ID.has(opener)) this.forcedStoryId = opener;
    this.nextDecisionAt = Math.min(this.nextDecisionAt, this.clock + 80);
  }

  /** Mind Lab: play one story by id on the next tick, bypassing scoring. */
  forceStory(storyId: string) {
    if (storyId === "DEMO_60S_ADORABILITY") {
      this.forcedStoryId = storyId;
      this.nextDecisionAt = this.clock;
      return;
    }
    if (!STORY_BY_ID.has(storyId)) return;
    this.forcedStoryId = storyId;
    this.nextDecisionAt = this.clock;
  }

  play(storyId: string) {
    this.forceStory(storyId);
  }

  /** Force Cherri to travel to a specific spatial zone. */
  forceZone(zone: BlobDestination) {
    this.forcedZone = zone;
    this.nextDecisionAt = this.clock;
  }

  /** Force Cherri to choose a new, non-current zone to wander toward. */
  forceWander() {
    const zones: BlobDestination[] = ["LEFT", "RIGHT", "UP_LEFT", "UP_RIGHT", "DOWN_LEFT", "DOWN_RIGHT"];
    const otherZones = zones.filter((z) => z !== this.memory.currentZone);
    const target = otherZones[Math.floor(this.rng.next() * otherZones.length)] ?? "CENTER";
    this.forceZone(target);
  }

  /** Command Cherri to return to the display center. */
  returnCenter() {
    this.forceZone("CENTER");
  }

  /** Reset spatial position and memory to center. */
  resetSpatial() {
    this.memory.reset();
    this.currentPlan = null;
    this.pendingPlan = null;
    this.nextDecisionAt = this.clock;
  }

  /** Mind Lab: skip the quiet gap and decide immediately. */
  thinkNow() {
    this.nextDecisionAt = this.clock;
  }

  setActingCycle(cycle: ActingCycle) {
    this.actingCycle = cycle;
    if (cycle === "SHOWCASE") {
      this.showcaseIndex = 0;
      this.openingDone = true;
    }
    const episode = CYCLE_EPISODE[cycle];
    if (episode) {
      this.episode = episode as Episode;
      this.episodeUntil = this.clock + 180_000;
    }
    this.nextDecisionAt = Math.min(this.nextDecisionAt, this.clock + 80);
  }

  setActingIntensity(intensity: ActingIntensity) {
    this.actingIntensity = intensity;
    this.scheduleMicro();
    this.nextSignatureAt = this.clock + INTENSITY_SCALE[intensity].signatureMin;
  }

  getActingCycle() {
    return this.actingCycle;
  }

  getActingIntensity() {
    return this.actingIntensity;
  }

  /** Make the next autonomous decision a relocation, chosen by the mind. */
  forceNextMove() {
    this.nextDecisionAt = this.clock;
    this.urge.update(0, this.driveState.drives, 30_000, 1, false);
  }

  /** The same, with the spatial urge pushed to the top of its range. */
  forceExplore() {
    this.nextDecisionAt = this.clock;
    this.openingDone = true;
    // Push the urge over the explore threshold immediately.
    this.urge.update(8_000, { ...this.driveState.drives, boredom: 1, curiosity: 1, sleepiness: 0 }, 30_000, 2, false);
  }

  /** Drop accumulated pressure to be somewhere else. */
  resetSpatialUrge() {
    this.urge.reset();
  }

  /** Dev-only pacing scale for the whole movement system. */
  setMovementEnergy(level: MovementEnergy) {
    this.movementEnergy = level;
  }

  /**
   * Mind Lab and long-run tests: advance the mind through simulated quiet
   * without performing anything. Boredom, sleepiness and the idle stages all
   * accumulate exactly as they would in real time.
   */
  fastForwardQuiet(ms: number) {
    const steps = Math.max(0, Math.round(ms / DECISION_STEP_MS));
    for (let i = 0; i < steps; i += 1) {
      this.clock += DECISION_STEP_MS;
      this.expireLive();
      this.driveState.drift(DECISION_STEP_MS, this.clock - this.memory.lastInteractionAt);
      deriveEmotion(this.driveState.drives, this.personality, this.emotionState);
      this.emitIdleEvents();
      this.urge.update(
        DECISION_STEP_MS,
        this.driveState.drives,
        this.memory.timeInZone(this.clock),
        MOVEMENT_ENERGY_GAIN[this.movementEnergy],
        false
      );
    }
    this.currentPlan = null;
    this.pendingPlan = null;
    this.nextDecisionAt = this.clock;
    this.nextMicroAt = this.clock + 400;
  }

  /* ------------------------------------------------------------------ tick */

  /**
   * Advances the mind. Called every frame, but only does work at DECISION_HZ.
   * Returns a plan when a new performance should start, otherwise null.
   */
  tick(dtMs: number, allowDecisions = true): MindPlan | null {
    const dt = Math.max(0, Math.min(dtMs, 250));
    this.clock += dt;
    this.accumulator += dt;
    this.pendingPlan = null;
    while (this.accumulator >= DECISION_STEP_MS) {
      this.accumulator -= DECISION_STEP_MS;
      this.step(DECISION_STEP_MS, allowDecisions);
    }
    return this.pendingPlan;
  }

  private step(dtMs: number, allowDecisions: boolean) {
    this.drainEvents();
    this.expireLive();
    this.driveState.drift(dtMs, this.clock - this.memory.lastInteractionAt);
    deriveEmotion(this.driveState.drives, this.personality, this.emotionState);
    this.urge.update(
      dtMs,
      this.driveState.drives,
      this.memory.timeInZone(this.clock),
      MOVEMENT_ENERGY_GAIN[this.movementEnergy],
      this.currentPlan !== null
    );
    this.escalation.prune(this.clock);
    this.emitIdleEvents();

    if (this.currentPlan && this.clock >= this.planStartedAt + this.currentPlan.durationMs) {
      this.finishPlan();
    }

    if (this.clock >= this.episodeUntil && !this.currentPlan && this.actingCycle === "NATURAL") {
      this.episode = chooseEpisode(this.driveState.drives, this.rng.next());
      this.episodeUntil = this.clock + this.rng.range(35_000, 70_000);
    }
    if (this.forcedZone) {
      const zone = this.forcedZone;
      this.forcedZone = null;
      this.startPlan({ id: `FORCE_TRAVEL_${zone}`, category: 'CURIOUS', rarity: 'COMMON',
        intention: 'EXPLORE', destination: zone, durationMs: 5200, cooldownMs: 0,
        priority: 100, interruptible: true, returnPolicy: 'HOLD',
        beats: [
          { phase: 'NOTICE', at: 0, gaze: zone.includes('LEFT') ? 'GLANCE_LEFT' : 'GLANCE_RIGHT' },
          { phase: 'ANTICIPATION', at: 350, primitive: 'LEAN', dir: zone.includes('LEFT') ? -1 : 1, amount: 0.35 },
          { phase: 'ACTION', at: 800, destination: zone, movementProfile: 'EXPLORE' },
          { phase: 'REACTION', at: 3200, expression: 'CURIOUS_WIDE' },
          { phase: 'RECOVERY', at: 4200, primitive: 'SETTLE', facing: 'FORWARD' },
        ] }, true);
      return;
    }
    if (this.forcedStoryId) {
      if (this.forcedStoryId === "DEMO_60S_ADORABILITY") {
        this.forcedStoryId = null;
        this.playAdorabilityDemo();
        return;
      }
      const def = STORY_BY_ID.get(this.forcedStoryId);
      this.forcedStoryId = null;
      if (def) {
        this.startPlan(def, true);
        return;
      }
    }

    if (!allowDecisions) return;
    if (this.held) return;
    if (this.clock >= this.nextDecisionAt) {
      this.decide();
      return;
    }
    if (this.currentPlan === null && this.clock >= this.nextMicroAt) {
      this.decideMicro();
    }
  }

  private drainEvents() {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) break;
      if (event.id === "GRAB_START") {
        this.held = true;
        if (this.currentPlan && this.currentPlan.category !== "INTERACTION") {
          this.finishPlan();
          this.currentPlan = null;
          this.pendingPlan = null;
        }
        this.nextMicroAt = this.clock + 60_000;
      }
      if (["RELEASE", "FLICK", "TOUCH_TAP", "TOUCH_DOUBLE_TAP", "RAPID_POKES"].includes(event.id)) {
        const wasHeld = this.held;
        this.held = false;
        if (wasHeld) {
          this.nextDecisionAt = this.clock + 380;
          this.nextMicroAt = this.clock + 900;
        }
      }
      this.lastEventDirection = event.direction;
      this.driveState.apply(event);
      const step = this.escalation.register(event, this.clock);
      if (step > 2) this.driveState.applyEscalation(step);
      this.memory.rememberEvent({
        id: event.id,
        atMs: this.clock,
        strength: event.strength,
      });
      this.live.unshift({ id: event.id, atMs: this.clock });
      if (this.live.length > EVENT_QUEUE_CAPACITY) this.live.pop();

      const physical =
        event.id !== "IDLE_SHORT" &&
        event.id !== "IDLE_MEDIUM" &&
        event.id !== "IDLE_LONG";
      if (physical) {
        this.memory.lastInteractionAt = this.clock;
        this.idleStage = 0;
      }
      if (event.id === "WALL_IMPACT") this.memory.lastWallImpactAt = this.clock;
      if (event.id === "GRAB_START") this.memory.lastGrabAt = this.clock;

      // A reflex-grade event gets to think immediately rather than waiting out
      // the current quiet gap. Whether it actually interrupts is decided by
      // priority in startPlan.
      if (this.isReflex(event)) this.nextDecisionAt = this.clock;
    }
  }

  private isReflex(event: MindEvent) {
    switch (event.id) {
      case "FLICK":
      case "WALL_IMPACT":
      case "GRAB_START":
      case "RELEASE":
      case "TOUCH_TAP":
      case "TOUCH_DOUBLE_TAP":
      case "RAPID_POKES":
      case "USER_RETURNED":
        return true;
      case "DRAG_FAST":
      case "WALL_PRESS":
      case "GRAB_HOLD":
        return event.strength > 0.5;
      default:
        return false;
    }
  }

  private expireLive() {
    while (
      this.live.length > 0 &&
      this.clock - this.live[this.live.length - 1].atMs > EVENT_WINDOW_MS
    ) {
      this.live.pop();
    }
  }

  /** Turns sustained quiet into real events, one stage at a time. */
  private emitIdleEvents() {
    const quiet = this.clock - this.memory.lastInteractionAt;
    while (
      this.idleStage < IDLE_THRESHOLDS.length &&
      quiet >= IDLE_THRESHOLDS[this.idleStage].ms
    ) {
      const threshold = IDLE_THRESHOLDS[this.idleStage];
      this.idleStage += 1;
      const event = { id: threshold.id, strength: 0.5, direction: 0 };
      this.driveState.apply(event);
      this.memory.rememberEvent({ id: threshold.id, atMs: this.clock, strength: 0.5 });
    }
  }

  /* -------------------------------------------------------------- decision */

  private shouldExplore(): boolean {
    if (this.held || this.live.length > 0) return false;
    const gain = MOVEMENT_ENERGY_GAIN[this.movementEnergy];
    if (this.urge.level >= EXPLORE_THRESHOLD) {
      const chance = clamp01(
        0.65 +
          (this.urge.level - EXPLORE_THRESHOLD) * 1.8 +
          (this.driveState.drives.curiosity + this.driveState.drives.playfulness) * 0.25
      );
      return this.rng.next() < chance * gain;
    }
    const parked = this.memory.timeInZone(this.clock);
    if (parked > 14_000) {
      const chance =
        clamp01(((parked - 14_000) / 20_000) * gain) *
        (1 - this.driveState.drives.sleepiness * 0.7);
      return this.rng.next() < chance;
    }
    return false;
  }

  private context(exploreTarget?: BlobDestination): ScoringContext {
    return {
      nowMs: this.clock,
      drives: this.driveState.drives,
      emotion: this.emotionState,
      personality: this.personality,
      memory: this.memory,
      liveEvents: this.live.map((entry) => entry.id),
      escalation: this.live.length ? this.escalation.step(this.escalation.familyOf(this.live[0].id), this.clock) : 0,
      msSinceInteraction: this.clock - this.memory.lastInteractionAt,
      spatialUrge: this.urge.level,
      exploreTarget,
    };
  }

  private decide() {
    if (this.held) {
      this.nextDecisionAt = this.clock + 400;
      return;
    }

    if (!this.openingDone && this.clock < 10_000 && !this.shouldExplore()) {
      const opener = this.pickOpening();
      if (opener) {
        this.openingDone = true;
        this.startPlan(opener, false);
        return;
      }
    }
    this.openingDone = true;

    if (this.actingCycle === "SHOWCASE") {
      const next = this.nextShowcaseStory();
      if (next) {
        this.startPlan(next, true);
        return;
      }
    }

    const wantsExplore = this.shouldExplore();
    let exploreTarget: BlobDestination | undefined;
    if (wantsExplore) {
      this.exploreIntent = chooseDestination(
        this.memory,
        this.driveState.drives,
        this.emotionState,
        this.personality,
        this.rng
      );
      exploreTarget = this.exploreIntent.zone;
    } else {
      this.exploreIntent = null;
    }

    const ctx = this.context(exploreTarget);
    const pool = this.candidatePool();
    const scores: CandidateScore[] = [];
    const compatible = EPISODE_CATEGORIES[this.episode];
    for (const def of pool) {
      const candidate = scoreStory(def, ctx);
      if (this.held && !def.requires?.events) { candidate.eligible = false; candidate.score = 0; }
      if (!def.requires?.events) {
        let multiplier = 1;
        if (this.actingCycle === "NATURAL") {
          multiplier = compatible.includes(def.category) ? 1.6 : def.category === "RARE" ? 1.35 : 0.18;
          multiplier *= cycleWeight(this.actingCycle, def.category);
        } else {
          multiplier = cycleWeight(this.actingCycle, def.category);
          if (compatible.includes(def.category)) multiplier *= 1.12;
        }
        multiplier *= cycleTagBoost(this.actingCycle, def.actingTags);
        if (def.signature) {
          const due = this.clock >= this.nextSignatureAt;
          if (!due) {
            candidate.eligible = false;
            candidate.score = 0;
          } else {
            multiplier *= 3.2;
          }
        }
        if (this.exploreIntent) {
          multiplier *= reasonAffinity(def, this.exploreIntent.reason);
        }
        candidate.score *= multiplier;
      } else if (candidate.eligible) candidate.score *= 4;
      scores.push(candidate);
    }
    this.lastCandidates = scores;

    const picked = weightedPick(scores, this.rng.next());
    if (!picked) {
      // Nothing is eligible. Wait a short beat rather than forcing a repeat.
      this.nextDecisionAt = this.clock + 900;
      return;
    }
    const def = STORY_BY_ID.get(picked.id);
    if (!def) {
      this.nextDecisionAt = this.clock + 900;
      return;
    }
    const destinationOverride =
      exploreTarget && isRetargetable(def)
        ? exploreTarget
        : isPlaceless(def)
        ? this.memory.currentZone
        : undefined;
    this.startPlan(def, false, destinationOverride);
  }

  /**
   * A requested intent narrows the pool to its categories while it holds. It
   * never injects a new performance — only reweights the authored ones.
   */
  private candidatePool(): readonly StoryDef[] {
    if (!this.intentRequest || this.clock > this.intentUntil) {
      this.intentRequest = null;
      return PERFORMANCE_STORIES;
    }
    const mapping = INTENT_MAP[this.intentRequest];
    const pool: StoryDef[] = [];
    for (const id of mapping.preferred) {
      const def = STORY_BY_ID.get(id);
      if (def) pool.push(def);
    }
    for (const category of mapping.categories) {
      const list = STORIES_BY_CATEGORY.get(category);
      if (list) for (const def of list) if (!pool.includes(def)) pool.push(def);
    }
    return pool.length > 0 ? pool : PERFORMANCE_STORIES;
  }

  private decideMicro() {
    if (this.held) {
      this.scheduleMicro();
      return;
    }
    const ctx = this.context();
    let best: StoryDef | null = null;
    let bestScore = 0;
    for (const def of MICRO_LIFE_STORIES) {
      const score = scoreStory(def, ctx);
      // Micro-life is chosen with a light random weight so it never falls into
      // a fixed rotation, which would read as a loop rather than as life.
      const jittered = score.eligible ? score.score * (0.6 + this.rng.next() * 0.8) : 0;
      if (jittered > bestScore) {
        bestScore = jittered;
        best = def;
      }
    }
    if (best) this.startPlan(best, false);
    else this.scheduleMicro();
  }

  /* ------------------------------------------------------------------ plan */

  private startPlan(def: StoryDef, forced: boolean, destinationOverride?: BlobDestination) {
    const current = this.currentPlan;
    if (current && !forced) {
      const elapsed = this.clock - this.planStartedAt;
      const nearlyDone = elapsed > current.durationMs * 0.85;
      const freshReaction = !!def.requires?.events && this.live.length > 0;
      if (!nearlyDone) {
        if (!freshReaction && !current.interruptible && def.priority <= current.priority) {
          this.nextDecisionAt = this.clock + 250;
          return;
        }
        if (!freshReaction && def.priority <= current.priority && def.category !== "MICRO") {
          this.nextDecisionAt = this.clock + 350;
          return;
        }
        if (def.category === "MICRO") {
          this.scheduleMicro();
          return;
        }
      }
    }

    const deliberate = destinationOverride !== undefined;
    const returnPolicyOverride =
      deliberate || (def.returnPolicy === "RETURN" && this.urge.level > EXPLORE_THRESHOLD)
        ? "HOLD"
        : undefined;

    const plan = this.buildPlan(def, destinationOverride, returnPolicyOverride);
    if (def.requires?.events) this.live = [];
    this.currentPlan = plan;
    this.planStartedAt = this.clock;
    this.pendingPlan = plan;

    // Scarcity lives here, not in the score: a tier's floor is a hard gate.
    const cooldown = Math.max(def.cooldownMs, RARITY_COOLDOWN_MS[def.rarity]);
    this.memory.rememberStory(
      {
        id: def.id,
        category: def.category,
        atMs: this.clock,
        destination: plan.destination,
        silhouette: def.silhouette,
        mouthFamily: def.mouthFamily,
        signature: def.signature,
      },
      this.clock + cooldown,
      def.rarity
    );

    if (def.category !== "MICRO") {
      this.driveState.relieve(
        def.category === "HAPPY" ||
          def.category === "PLAYFUL" ||
          def.category === "SURPRISED"
      );
    }

    if (def.category === "MICRO") {
      this.scheduleMicro();
      // Micro-life must never postpone a real thought.
      this.nextDecisionAt = Math.max(this.nextDecisionAt, this.clock + plan.durationMs);
    } else {
      this.nextDecisionAt = this.clock + plan.durationMs + this.quietGap();
      this.nextMicroAt = this.clock + plan.durationMs + 400;
      if (def.signature) this.scheduleSignature();
    }
  }

  finishPlan(finalDest?: BlobDestination) {
    if (this.currentPlan) {
      const finalZone =
        finalDest ??
        (this.currentPlan.returnPolicy === "RETURN"
          ? "CENTER"
          : this.currentPlan.destination);
      this.settleIn(finalZone);
    } else if (finalDest) {
      this.settleIn(finalDest);
    }
    this.currentPlan = null;
  }

  /** Records an arrival and spends the urge in proportion to the trip. */
  private settleIn(zone: BlobDestination) {
    const from = this.memory.currentZone;
    if (zone !== from) this.urge.spend(zoneDistance(from, zone));
    this.memory.setZone(zone, this.clock);
  }

  /**
   * The rhythm control. Sleepy Cherri waits longer between thoughts, playful
   * Cherri less, and there is always a quiet tail so the screen is not busy.
   */
  private quietGap(): number {
    const arousal = this.emotionState.arousal;
    const drives = this.driveState.drives;
    const scale = INTENSITY_SCALE[this.actingIntensity];
    const cycle = CYCLE_QUIET[this.actingCycle];
    const base = 1_100 + (1 - arousal) * 2_400;
    const impatience =
      drives.boredom * 1_200 +
      drives.curiosity * 900 +
      drives.playfulness * 800 +
      this.urge.level * 1_100;
    const drowsy = 1 + drives.sleepiness * (this.episode === "SLEEPY" || this.actingCycle === "SLEEPY" ? 1.35 : 0.7);
    const jitter = this.rng.range(-400, 1_200);
    let gap = (base - impatience + jitter) * drowsy * scale.quiet * cycle;
    if (this.actingCycle !== "SHOWCASE" && this.actingCycle !== "HYPER" && this.rng.next() < 0.1) {
      gap += this.rng.range(1_400, 3_200);
    }
    gap /= MOVEMENT_ENERGY_GAIN[this.movementEnergy];
    const min = this.actingCycle === "HYPER" ? 280 : 500;
    const max = this.actingCycle === "SLEEPY" ? 16_000 : this.actingCycle === "SHOWCASE" ? 2_200 : 9_000;
    return clamp(gap, min, max);
  }

  private scheduleMicro() {
    const scale = INTENSITY_SCALE[this.actingIntensity];
    let min = scale.microMin;
    let max = scale.microMax;
    if (this.actingCycle === "SLEEPY") {
      min *= 1.4;
      max *= 1.5;
    } else if (this.actingCycle === "HYPER") {
      min *= 0.7;
      max *= 0.75;
    }
    this.nextMicroAt = this.clock + this.rng.range(min, max);
  }

  private scheduleSignature() {
    const scale = INTENSITY_SCALE[this.actingIntensity];
    let min = scale.signatureMin;
    let max = scale.signatureMax;
    if (this.actingCycle === "FUNNY" || this.actingCycle === "MISCHIEF") {
      min *= 0.85;
      max *= 0.85;
    } else if (this.actingCycle === "SLEEPY") {
      min *= 1.35;
      max *= 1.4;
    } else if (this.actingCycle === "HYPER") {
      min *= 0.7;
      max *= 0.75;
    }
    this.nextSignatureAt = this.clock + this.rng.range(min, max);
  }

  private pickOpening(): StoryDef | null {
    const preferred = CYCLE_OPENING[this.actingCycle] ?? OPENING_POOL;
    const pool = preferred.filter((id) => STORY_BY_ID.has(id));
    if (pool.length === 0) return null;
    const id = pool[Math.floor(this.rng.next() * pool.length)] ?? pool[0];
    return STORY_BY_ID.get(id) ?? null;
  }

  private nextShowcaseStory(): StoryDef | null {
    if (SHOWCASE_SEQUENCE.length === 0) return null;
    if (this.showcaseIndex >= SHOWCASE_SEQUENCE.length) this.showcaseIndex = 0;
    const id = SHOWCASE_SEQUENCE[this.showcaseIndex];
    this.showcaseIndex += 1;
    return STORY_BY_ID.get(id) ?? null;
  }

  /** Resolves an authored story into concrete, timestamped cues with proper spatial staging. */
  private buildPlan(
    def: StoryDef,
    destinationOverride?: BlobDestination,
    returnPolicyOverride?: ReturnPolicy
  ): MindPlan {
    const fromZone = this.memory.currentZone;
    const resolved =
      destinationOverride ??
      effectiveDestination(def, fromZone, this.exploreIntent?.zone);
    const deliberate = destinationOverride !== undefined || resolved !== def.destination;
    const mirror =
      !def.id.startsWith("FORCE_") &&
      !deliberate &&
      (def.requires?.events
        ? this.lastEventDirection < 0
        : resolved !== "CENTER" && this.memory.destinationRecency(resolved) >= 0);
    const tempo =
      def.id.startsWith("DEMO_") || def.category === "MICRO" || def.requires?.events
        ? 1
        : this.episode === "SLEEPY" || this.actingCycle === "SLEEPY"
        ? 1.22
        : this.actingCycle === "HYPER"
        ? 0.9
        : 1;
    const plan = compilePerformance(
      def,
      fromZone,
      mirror,
      tempo,
      resolved !== fromZone ? resolved : undefined,
      returnPolicyOverride
    );
    this.memory.setTargetZone(plan.destination);
    return plan;
  }

  /** Execution reports actual arrival independently of story metadata. */
  observeZone(zone: BlobDestination) { this.memory.setZone(zone, this.clock); }

  /** Plays the deterministic 60-second clip-worthy Showcase. */
  playAdorabilityDemo(): MindPlan {
    const demoBeats: StoryBeat[] = [
      // 0–6s Caught you looking
      // A manual showcase can be launched while an autonomous thought is
      // parked at any edge. Make the return to the display center an authored
      // first cue so the clip never opens half off-screen.
      {
        phase: "NOTICE",
        at: 0,
        destination: "CENTER",
        movementMode: "FLOAT",
        movementProfile: "REST",
        returnPolicy: "HOLD",
        facing: "FORWARD",
        gaze: "LOOK_UP",
        expression: "CURIOUS_WIDE",
      },
      { phase: "ANTICIPATION", at: 280, expression: "HAPPY_EYES", mouth: "SMALL_O", holdMs: 160 },
      { phase: "ACTION", at: 620, mouth: "D_SMILE", primitive: "PUFF", amount: 1.15 },
      { phase: "REACTION", at: 1600, gaze: "GLANCE_LEFT", expression: "SHY_EYES", mouth: "CRESCENT_SHARP", holdMs: 320 },
      { phase: "REACTION", at: 2600, facing: "FORWARD", expression: "HAPPY_EYES", mouth: "SMIRK", holdMs: 280 },
      { phase: "RECOVERY", at: 3800, primitive: "SETTLE", amount: 0.55, mouth: "MOUTH_RELAX", expression: "SOFT_SQUINT" },

      // 6–13s Innocent blep — tongue must be unmistakable
      { phase: "NOTICE", at: 6200, expression: "SOFT_SQUINT", gaze: "LOOK_UP" },
      { phase: "ANTICIPATION", at: 6500, mouth: "CRESCENT_SHARP", expression: "HAPPY_EYES", holdMs: 180 },
      { phase: "ACTION", at: 6900, mouth: "BLEP", primitive: "SQUISH", amount: 0.85 },
      { phase: "REACTION", at: 7800, mouth: "BLEP", expression: "ONE_EYE_SQUINT_LEFT", holdMs: 520 },
      { phase: "RECOVERY", at: 9800, mouth: "CRESCENT_SHARP", primitive: "SETTLE", amount: 0.4 },

      // 12–18s Failed wink
      { phase: "NOTICE", at: 12000, facing: "FORWARD", expression: "HAPPY_EYES", mouth: "SMIRK" },
      { phase: "ANTICIPATION", at: 12500, expression: "ONE_EYE_SQUINT_LEFT", mouth: "SMIRK", holdMs: 220 },
      { phase: "ACTION", at: 13100, expression: "SOFT_SQUINT", mouth: "SMALL_O", primitive: "SQUISH", amount: 0.7 },
      { phase: "REACTION", at: 14000, expression: "CONFUSED_EYES", mouth: "GASP", holdMs: 280 },
      { phase: "REACTION", at: 15200, expression: "SHY_EYES", primitive: "SHRINK", amount: 0.85, mouth: "NERVOUS" },
      { phase: "RECOVERY", at: 16400, primitive: "SETTLE", expression: "HAPPY_EYES", mouth: "CRESCENT_SHARP" },

      // 18–26s Proud puff — giant silhouette
      { phase: "NOTICE", at: 18400, gaze: "LOOK_UP", expression: "HAPPY_EYES" },
      { phase: "ANTICIPATION", at: 18700, primitive: "SQUISH", amount: 1, mouth: "SMALL_O", holdMs: 220 },
      { phase: "ACTION", at: 19300, primitive: "INFLATE", amount: 1.35, expression: "EXCITED_EYES", mouth: "D_SMILE" },
      { phase: "REACTION", at: 20800, mouth: "D_SMILE", expression: "HAPPY_EYES", primitive: "INFLATE", amount: 1.2, holdMs: 420 },
      { phase: "RECOVERY", at: 23000, primitive: "SETTLE", amount: 0.6, mouth: "SMIRK" },

      // 26–34s Sneeze that doesn't happen
      { phase: "NOTICE", at: 25200, gaze: "LOOK_UP", expression: "CURIOUS_WIDE" },
      { phase: "ANTICIPATION", at: 25600, primitive: "STRETCH_UP", amount: 1.2, mouth: "GASP", holdMs: 320 },
      { phase: "ANTICIPATION", at: 26800, mouth: "BIG_O", expression: "PANIC_EYES", holdMs: 260 },
      { phase: "ACTION", at: 27600, primitive: "SETTLE", amount: 0.45, mouth: "FLAT" },
      { phase: "REACTION", at: 28400, expression: "CONFUSED_EYES", mouth: "NERVOUS", holdMs: 300 },
      { phase: "RECOVERY", at: 30400, primitive: "SETTLE", expression: "SOFT_SQUINT", mouth: "CRESCENT_SHARP" },

      // 34–41s Silent laugh + tongue
      { phase: "NOTICE", at: 32800, expression: "HAPPY_EYES", mouth: "CRESCENT_SHARP" },
      { phase: "ANTICIPATION", at: 33100, primitive: "SQUISH", amount: 0.75, mouth: "OPEN_LAUGH", holdMs: 160 },
      { phase: "ACTION", at: 33500, primitive: "GIGGLE", amount: 1.2, expression: "EXCITED_EYES", mouth: "BIG_LAUGH" },
      { phase: "REACTION", at: 34800, mouth: "TONGUE_OUT", expression: "HAPPY_EYES", holdMs: 420 },
      { phase: "RECOVERY", at: 36600, primitive: "SETTLE", mouth: "D_SMILE", expression: "SOFT_SQUINT" },

      // 41–47s Raspberry
      { phase: "NOTICE", at: 40000, expression: "DEADPAN_EYES", gaze: "LOOK_UP" },
      { phase: "ANTICIPATION", at: 40400, primitive: "LEAN", amount: 0.85, mouth: "SMALL_O", holdMs: 200 },
      { phase: "ACTION", at: 41000, mouth: "RASPBERRY", primitive: "SHIVER", amount: 1.1, expression: "HAPPY_EYES" },
      { phase: "REACTION", at: 42200, mouth: "TONGUE_OUT", expression: "EXCITED_EYES", holdMs: 360 },
      { phase: "RECOVERY", at: 43800, primitive: "SETTLE", mouth: "SMIRK" },

      // 47–55s Pancake — must read as a splat
      { phase: "NOTICE", at: 46000, gaze: "LOOK_DOWN", expression: "CURIOUS_WIDE" },
      { phase: "ANTICIPATION", at: 46400, mouth: "SMALL_O", primitive: "SQUISH", amount: 0.7, holdMs: 180 },
      { phase: "ACTION", at: 46900, primitive: "FLATTEN", amount: 1.4, mouth: "FLAT", expression: "DEADPAN_EYES" },
      { phase: "REACTION", at: 48400, mouth: "FLAT", expression: "DEADPAN_EYES", primitive: "FLATTEN", amount: 1.25, holdMs: 480 },
      { phase: "REACTION", at: 50800, primitive: "INFLATE", amount: 0.7, expression: "CURIOUS_WIDE", mouth: "GASP" },
      { phase: "RECOVERY", at: 52400, primitive: "SETTLE", expression: "HAPPY_EYES", mouth: "CRESCENT_SHARP" },

      // 55–60s Smug side-eye + a little hop
      { phase: "NOTICE", at: 53600, gaze: "GLANCE_RIGHT", expression: "DEADPAN_EYES" },
      { phase: "ANTICIPATION", at: 54100, mouth: "FLAT", holdMs: 200 },
      { phase: "ACTION", at: 54600, mouth: "SMIRK", expression: "ONE_EYE_SQUINT_LEFT", primitive: "LEAN", dir: 1, amount: 0.75 },
      { phase: "REACTION", at: 55600, mouth: "SMIRK", primitive: "HOP", amount: 0.9, holdMs: 200 },
      { phase: "RECOVERY", at: 57600, facing: "FORWARD", primitive: "SETTLE", expression: "SOFT_SQUINT", mouth: "CRESCENT_SHARP" },
    ];

    const demoDef: StoryDef = {
      id: "DEMO_60S_ADORABILITY",
      category: "HAPPY",
      rarity: "SPECIAL",
      signature: true,
      silhouette: "SHOWCASE",
      mouthFamily: "SMILE",
      intention: "PLAY",
      destination: "CENTER",
      durationMs: 60_000,
      cooldownMs: 0,
      priority: 100,
      interruptible: false,
      movementMode: "STAY",
      movementProfile: "PLAY",
      returnPolicy: "HOLD",
      beats: demoBeats,
      note: "Deterministic 60-second V4.5 acting showcase.",
    };

    const plan = this.buildPlan(demoDef);
    this.currentPlan = plan;
    this.pendingPlan = plan;
    this.planStartedAt = this.clock;
    this.nextDecisionAt = this.clock + plan.durationMs + 800;
    this.nextMicroAt = this.clock + plan.durationMs + 600;
    this.nextSignatureAt = this.clock + plan.durationMs + 4_000;
    return plan;
  }

  /* ------------------------------------------------------------- telemetry */

  get activePlan(): MindPlan | null {
    return this.currentPlan;
  }

  get emotion(): Emotion {
    return this.emotionState;
  }

  get mood() {
    return moodFromEmotion(this.emotionState, this.driveState.drives);
  }

  get spatial() {
    return {
      currentZone: this.memory.currentZone,
      targetZone: this.memory.targetZone,
      previousZone: this.memory.previousZone,
      recentZones: this.memory.recentZones(),
      timeInZoneMs: this.memory.timeInZone(this.clock),
      spatialUrge: this.urge.level,
      msSinceWorldMove: this.memory.msSinceWorldMove(this.clock),
    };
  }

  /** Which phase of the current performance is on screen right now. */
  currentPhase(): { phase: PerformancePhase | "NONE"; index: number } {
    const plan = this.currentPlan;
    if (!plan) return { phase: "NONE", index: 0 };
    const elapsed = this.clock - this.planStartedAt;
    let phase: PerformancePhase | "NONE" = "NONE";
    let index = 0;
    const seen: PerformancePhase[] = [];
    for (const cue of plan.cues) {
      if (!seen.includes(cue.phase)) seen.push(cue.phase);
      if (cue.atMs <= elapsed) {
        phase = cue.phase;
        index = seen.indexOf(cue.phase) + 1;
      }
    }
    return { phase, index };
  }

  telemetry(): MindTelemetry {
    const { phase, index } = this.currentPhase();
    const plan = this.currentPlan;
    const elapsed = plan ? this.clock - this.planStartedAt : 0;
    const progress = plan && plan.durationMs > 0 ? clamp01(elapsed / plan.durationMs) : 0;

    return {
      seed: this.seedValue,
      clockMs: this.clock,
      drives: this.driveState.snapshot(),
      emotion: { ...this.emotionState },
      personality: { ...this.personality },
      mood: emotionLabel(this.emotionState, this.driveState.drives),
      storyId: plan?.storyId ?? "—",
      category: plan?.category ?? "NONE",
      phase,
      phaseIndex: index,
      phaseCount: plan?.phaseCount ?? 0,
      intention: plan?.intention ?? "REST",
      nextDecisionMs: Math.max(0, this.nextDecisionAt - this.clock),
      recentStories: this.memory.recentStoryIds(),
      recentEvents: this.memory.recentEventIds(),
      candidates: [...this.lastCandidates]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
      cooldowns: this.memory.cooldownList(this.clock).slice(0, 10),
      msSinceInteraction: this.clock - this.memory.lastInteractionAt,
      escalation: this.escalation.peak(this.clock),
      currentZone: this.memory.currentZone,
      targetZone: this.memory.targetZone,
      previousZone: this.memory.previousZone,
      recentZones: this.memory.recentZones(),
      timeInZoneMs: this.memory.timeInZone(this.clock),
      spatialUrge: this.urge.level,
      spatialUrgeTarget: this.urge.target,
      msSinceWorldMove: this.memory.msSinceWorldMove(this.clock),
      movementEnergy: this.movementEnergy,
      nextMovementBias: movementBiasLabel(
        this.urge.level,
        this.driveState.drives,
        this.memory.currentZone
      ),
      movementMode: plan?.movementMode ?? "STAY",
      movementProgress: progress,
      movementProfile: plan?.movementProfile ?? "REST",
      returnPolicy: plan?.returnPolicy ?? "HOLD",
      directorOwner: "MIND_V4_5",
      episode: this.episode,
      episodeRemainingMs: Math.max(0, this.episodeUntil - this.clock),
      targetX: 0, targetY: 0,
      travelYawTarget: 0,
      travelPitchTarget: 0,
      worldX: 0,
      worldY: 0,
      yawSource: "NEUTRAL",
      facingIntent: plan?.facing ?? "FORWARD",
      actingCycle: this.actingCycle,
      actingIntensity: this.actingIntensity,
      nextSignatureMs: Math.max(0, this.nextSignatureAt - this.clock),
      openingDone: this.openingDone,
    };
  }
}
