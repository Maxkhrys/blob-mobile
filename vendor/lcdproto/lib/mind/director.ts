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

  private nextDecisionAt = 1_400;
  private nextMicroAt = 900;
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
    this.nextDecisionAt = 1_400;
    this.nextMicroAt = 900;
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
    this.nextDecisionAt = Math.min(this.nextDecisionAt, this.clock + 150);
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

  /** Make the next autonomous decision a relocation, chosen by the mind. */
  forceNextMove() {
    this.nextDecisionAt = this.clock;
    this.urge.update(0, this.driveState.drives, 30_000, 1, false);
  }

  /** The same, with the spatial urge pushed to the top of its range. */
  forceExplore() {
    this.nextDecisionAt = this.clock;
    // Push the urge over the explore threshold immediately.
    this.urge.update(0, { ...this.driveState.drives, boredom: 1, curiosity: 1, sleepiness: 0 }, 30_000, 2, false);
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

    if (this.clock >= this.episodeUntil && !this.currentPlan) {
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
      if (event.id === "GRAB_START") this.held = true;
      if (["RELEASE", "FLICK", "TOUCH_TAP", "TOUCH_DOUBLE_TAP", "RAPID_POKES"].includes(event.id)) this.held = false;
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
        let multiplier = compatible.includes(def.category) ? 1.6 : def.category === "RARE" ? 1.35 : 0.18;
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
    const base = 1_900 + (1 - arousal) * 3_600;
    const impatience =
      drives.boredom * 1_500 +
      drives.curiosity * 1_100 +
      drives.playfulness * 900 +
      this.urge.level * 1_400;
    const drowsy = 1 + drives.sleepiness * (this.episode === "SLEEPY" ? 1.5 : 0.95);
    const jitter = this.rng.range(-600, 1_900);
    let gap = (base - impatience + jitter) * drowsy;
    if (this.rng.next() < 0.14) gap += this.rng.range(2_800, 7_000);
    gap /= MOVEMENT_ENERGY_GAIN[this.movementEnergy];
    return clamp(gap, 900, 15_000);
  }

  private scheduleMicro() {
    const arousal = this.emotionState.arousal;
    this.nextMicroAt = this.clock + this.rng.range(1_000, 2_600 + (1 - arousal) * 1_800);
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
        : this.episode === "SLEEPY"
        ? 1.35
        : 1.12;
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

  /** Plays the deterministic 60-second Adorability regression demo */
  playAdorabilityDemo(): MindPlan {
    const demoBeats: StoryBeat[] = [
      // 0s-7s: Quiet resting in center, soft breathing
      { phase: "NOTICE", at: 0, expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX" },
      { phase: "ACTION", at: 200, body: "IDLE_SOFT_BREATH" },
      { phase: "RECOVERY", at: 4500, primitive: "SETTLE", amount: 0.4 },

      // 7s-16s: Notices UP_LEFT, anticipates, buoyant arc travel to UP_LEFT
      { phase: "NOTICE", at: 7200, gaze: "GLANCE_LEFT" },
      { phase: "ANTICIPATION", at: 7400, primitive: "LEAN", dir: -1, amount: 0.6, expression: "CURIOUS_WIDE" },
      { phase: "ACTION", at: 7700, destination: "UP_LEFT", movementMode: "TRAVEL", movementProfile: "INSPECT", body: "SOFT_SWAY_LEFT" },
      { phase: "REACTION", at: 11000, mouth: "MOUTH_O", blink: true },
      { phase: "RECOVERY", at: 13500, primitive: "SETTLE", returnPolicy: "HOLD" },

      // 16s-26s: Playful hop across world to RIGHT with slight overshoot
      { phase: "NOTICE", at: 16200, gaze: "GLANCE_RIGHT", expression: "HAPPY_EYES" },
      { phase: "ANTICIPATION", at: 16500, primitive: "TILT", dir: 1, amount: 0.7 },
      { phase: "ACTION", at: 16900, destination: "RIGHT", movementMode: "DASH", movementProfile: "PLAY", primitive: "DOUBLE_HOP", amount: 1.2 },
      { phase: "REACTION", at: 20500, mouth: "MOUTH_TWITCH", primitive: "WOBBLE", amount: 0.5 },
      { phase: "RECOVERY", at: 23500, primitive: "SETTLE", returnPolicy: "HOLD" },

      // 26s-36s: Physical comedy: balance test at RIGHT, leans too far, catches balance
      { phase: "NOTICE", at: 26500, gaze: "LOOK_DOWN", expression: "CURIOUS_WIDE" },
      { phase: "ANTICIPATION", at: 27000, primitive: "LEAN", dir: -1, amount: 1.1 },
      { phase: "ACTION", at: 28500, primitive: "BALANCE", amount: 1.0 },
      { phase: "REACTION", at: 31000, primitive: "PUFF", amount: 0.8, mouth: "MOUTH_O", blink: true },
      { phase: "RECOVERY", at: 33500, expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX", primitive: "SETTLE" },

      // 36s-47s: Drifts down to DOWN_LEFT, cozy sleepy yawn
      { phase: "NOTICE", at: 36500, gaze: "LOOK_DOWN", expression: "SLEEPY_EYES" },
      { phase: "ANTICIPATION", at: 37000, primitive: "SLUMP", amount: 0.6 },
      { phase: "ACTION", at: 37600, destination: "DOWN_LEFT", movementMode: "DRIFT", movementProfile: "SLEEPY", body: "SLEEPY_YAWN" },
      { phase: "REACTION", at: 42000, mouth: "MOUTH_RELAX", blink: true },
      { phase: "RECOVERY", at: 45000, primitive: "SETTLE", returnPolicy: "HOLD" },

      // 47s-60s: Gentle buoyant return to CENTER, warm content smile
      { phase: "NOTICE", at: 47500, gaze: "GLANCE_RIGHT", expression: "SOFT_SQUINT" },
      { phase: "ANTICIPATION", at: 48000, primitive: "LEAN", dir: 1, amount: 0.5 },
      { phase: "ACTION", at: 48500, destination: "CENTER", movementMode: "RETURN", movementProfile: "AFFECTION", body: "JOY_HOP" },
      { phase: "REACTION", at: 53000, mouth: "MOUTH_TWITCH", blink: true },
      { phase: "RECOVERY", at: 56500, expression: "SOFT_SQUINT", mouth: "MOUTH_RELAX", primitive: "SETTLE", returnPolicy: "HOLD" },
    ];

    const demoDef: StoryDef = {
      id: "DEMO_60S_ADORABILITY",
      category: "HAPPY",
      rarity: "SPECIAL",
      intention: "PLAY",
      destination: "CENTER",
      durationMs: 60_000,
      cooldownMs: 0,
      priority: 100,
      interruptible: false,
      movementMode: "TRAVEL",
      movementProfile: "PLAY",
      returnPolicy: "HOLD",
      beats: demoBeats,
      note: "Deterministic 60-second adorability reference demo.",
    };

    const plan = this.buildPlan(demoDef);
    this.currentPlan = plan;
    this.pendingPlan = plan;
    this.planStartedAt = this.clock;
    this.nextDecisionAt = this.clock + plan.durationMs;
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
      directorOwner: "MIND_V4",
      episode: this.episode,
      episodeRemainingMs: Math.max(0, this.episodeUntil - this.clock),
      targetX: 0, targetY: 0,
      travelYawTarget: 0,
      travelPitchTarget: 0,
      worldX: 0,
      worldY: 0,
      yawSource: "NEUTRAL",
      facingIntent: plan?.facing ?? "FORWARD",
    };
  }
}
