import {
  BlobMind,
  DESTINATION_POSES,
  type BlobDestination,
  type BlobIntention,
  type MindStory,
} from "../blobMind";
import { FACE_STYLE } from "../blobRig";
import { CherriMind } from "../mind/director";
import type {
  FacingIntent,
  MindCue,
  MindEvent,
  MindIntent,
  MindPlan,
  MindTelemetry,
  MovementEnergy,
  MovementMode,
  MovementProfile,
  PrimitiveId,
  ReturnPolicy,
  YawSource,
} from "../mind/types";
import {
  PRIMITIVES,
  samplePrimitive,
  ZERO_FRAME,
  type BodyFrame,
} from "./primitives";
import { STORY_BY_ID } from "../mind/catalogue";
import {
  type BehaviourConfig,
  type BehaviourId,
  type BehaviourStatus,
  type BodyBehaviour,
  type ExpressionBehaviour,
  type GazeBehaviour,
  type HomeActivityStatus,
  type HomeMood,
  IDLE_GAZES,
  type MouthBehaviour,
  NEUTRAL_DELTA,
  type PoseDelta,
  type SpecialBehaviour,
} from "./types";

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;
const clamp01 = (v: number) => clamp(v, 0, 1);
const smoothstep = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * clamp01(amount);
const preserveAreaX = (scaleYDelta: number) => 1 / (1 + scaleYDelta) - 1;
// Intentional exit point: once the Blob has faded, move its tiny remnant
// beyond the 233px circular glass so the vanish is spatial, not just opacity.
const VANISH_EDGE = 248;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SpringAxis {
  value: number;
  velocity = 0;
  target: number;

  constructor(initial = 0) {
    this.value = initial;
    this.target = initial;
  }

  reset(initial = 0) {
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
  }

  step(dt: number, frequency: number, damping: number) {
    const omega = Math.PI * 2 * frequency;
    const acceleration =
      (this.target - this.value) * omega * omega -
      this.velocity * (2 * damping * omega);
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
  }
}

interface MoodPose {
  leftTension: number;
  rightTension: number;
  eyeScaleX: number;
  eyeScaleY: number;
  mouthX: number;
  mouthY: number;
  mouthScaleX: number;
  mouthScaleY: number;
  mouthRotation: number;
  mouthCurve: number;
  mouthD: number;
  mouthCrescent: number;
}

const MOODS: Record<HomeMood, MoodPose> = {
  CONTENT: {
    leftTension: 0.97,
    rightTension: 0.985,
    eyeScaleX: 0,
    eyeScaleY: 0,
    mouthX: 0,
    mouthY: 0,
    mouthScaleX: 0,
    mouthScaleY: 0,
    mouthRotation: 0,
    mouthCurve: 0.84,
    mouthD: 0,
    mouthCrescent: 0.65,
  },
  CURIOUS: {
    leftTension: 1.06,
    rightTension: 1.08,
    eyeScaleX: 0.025,
    eyeScaleY: 0.06,
    mouthX: 0.25,
    mouthY: -0.18,
    mouthScaleX: -0.12,
    mouthScaleY: 0.09,
    mouthRotation: 2,
    mouthCurve: 0.45,
    mouthD: 0.18,
    mouthCrescent: 0.25,
  },
  SLEEPY: {
    leftTension: 0.84,
    rightTension: 0.87,
    eyeScaleX: 0.035,
    eyeScaleY: -0.02,
    mouthX: -0.12,
    mouthY: 0.42,
    mouthScaleX: 0.05,
    mouthScaleY: -0.05,
    mouthRotation: -1.5,
    mouthCurve: 0.18,
    mouthD: 0.05,
    mouthCrescent: 0.1,
  },
  AMUSED: {
    leftTension: 0.9,
    rightTension: 0.93,
    eyeScaleX: 0.02,
    eyeScaleY: -0.015,
    mouthX: 0.15,
    mouthY: -0.18,
    mouthScaleX: 0.075,
    mouthScaleY: 0.025,
    mouthRotation: 1.5,
    mouthCurve: 0.96,
    mouthD: 0.78,
    mouthCrescent: 0.75,
  },
  DISTRACTED: {
    leftTension: 0.97,
    rightTension: 1.02,
    eyeScaleX: 0,
    eyeScaleY: 0.025,
    mouthX: 0.35,
    mouthY: 0.12,
    mouthScaleX: -0.06,
    mouthScaleY: 0.02,
    mouthRotation: 3,
    mouthCurve: 0.25,
    mouthD: 0.22,
    mouthCrescent: 0.2,
  },
  THOUGHTFUL: {
    leftTension: 0.9,
    rightTension: 0.97,
    eyeScaleX: 0.025,
    eyeScaleY: -0.01,
    mouthX: -0.35,
    mouthY: 0.24,
    mouthScaleX: -0.08,
    mouthScaleY: 0.015,
    mouthRotation: -4,
    mouthCurve: -0.12,
    mouthD: 0.1,
    mouthCrescent: 0,
  },
};

const MOOD_ORDER: readonly HomeMood[] = [
  "CONTENT",
  "CURIOUS",
  "SLEEPY",
  "AMUSED",
  "DISTRACTED",
  "THOUGHTFUL",
];

const MOOD_FACE: Record<
  HomeMood,
  { style: number; pupilScale: number }
> = {
  CONTENT: { style: FACE_STYLE.CONTENT, pupilScale: 0.96 },
  CURIOUS: { style: FACE_STYLE.SURPRISED, pupilScale: 1.08 },
  SLEEPY: { style: FACE_STYLE.SLEEPY, pupilScale: 0.78 },
  AMUSED: { style: FACE_STYLE.HAPPY, pupilScale: 1.12 },
  DISTRACTED: { style: FACE_STYLE.CONFUSED, pupilScale: 0.9 },
  THOUGHTFUL: { style: FACE_STYLE.DEADPAN, pupilScale: 0.84 },
};


/** Independent-channel director with current-presentation retargeting. */
export class BehaviourController {
  private clock = 0;
  private initialized = false;
  private autoWasEnabled = true;
  private rand = mulberry32(0x1a11ee);
  private mood: HomeMood = "CONTENT";
  private lastMood: HomeMood = "CONTENT";
  private nextMoodAt = 0;
  private nextMicroAt = 0;
  private nextGazeAt = 0;
  private nextBlinkAt = 0;
  private nextExpressionAt = 0;
  private nextMouthAt = 0;
  private nextBodyAt = 0;
  private nextBeatAt = 0;

  /** One authored thought can cue several channels without random collisions. */
  private beatUntil = 0;
  private beatExpressionAt = 0;
  private beatMouthAt = 0;
  private beatBodyAt = 0;
  private beatExpressionId: ExpressionBehaviour | null = null;
  private beatMouthId: MouthBehaviour | null = null;
  private beatBodyId: BodyBehaviour | null = null;
  private manualBeat = false;
  private spinStartedAt = -1;
  private spinRotation = 0;
  private impactAt = 0;
  private impactDirection = 0;
  private specialAction: SpecialBehaviour | null = null;
  private lastIdleGaze: GazeBehaviour | null = null;
  private specialStartedAt = -1;
  private specialEmoteStarted = false;
  private specialScale = 0;
  private specialOpacity = 1;
  private specialDirection = 1;

  private gazeAction = "RESTING";
  private lidAction = "OPEN";
  private mouthAction = "SMILE";
  private bodyAction = "SUSPENDED";
  private gazeReleaseAt = 0;
  private expressionReleaseAt = 0;
  private mouthReleaseAt = 0;
  private bodyReleaseAt = 0;
  private followAt = 0;
  private followReleaseAt = 0;
  private followXTarget = 0;
  private followRotationTarget = 0;
  private followScaleYTarget = 0;

  private activityId: BehaviourId = "REST";
  private activityStartedAt = 0;
  private activityUntil = 0;

  private blinkStartedAt = -1;
  private blinkDouble = false;
  private blinkLid = 1;
  private blinkState: BehaviourStatus["blinkState"] = "open";

  private baseGazeX = 0;
  private baseGazeY = 0;
  private microX = 0;
  private microY = 0;

  private readonly leftX = new SpringAxis();
  private readonly leftY = new SpringAxis();
  private readonly rightX = new SpringAxis();
  private readonly rightY = new SpringAxis();
  private readonly leftScaleX = new SpringAxis();
  private readonly leftScaleY = new SpringAxis();
  private readonly rightScaleX = new SpringAxis();
  private readonly rightScaleY = new SpringAxis();
  private readonly leftRotation = new SpringAxis();
  private readonly rightRotation = new SpringAxis();
  private readonly leftBrowRotation = new SpringAxis();
  private readonly rightBrowRotation = new SpringAxis();
  private readonly leftTension = new SpringAxis(1);
  private readonly rightTension = new SpringAxis(1);
  private readonly mouthX = new SpringAxis();
  private readonly mouthY = new SpringAxis();
  private readonly mouthScaleX = new SpringAxis();
  private readonly mouthScaleY = new SpringAxis();
  private readonly mouthRotation = new SpringAxis();
  private readonly mouthCurve = new SpringAxis(0.82);
  private readonly mouthO = new SpringAxis();
  private readonly mouthD = new SpringAxis();
  private readonly mouthCrescent = new SpringAxis();
  private mouthOpacityValue = 1;
  private mouthTurnStartedAt = -1;
  private mouthTurnTarget = 0;
  private mouthTurnSnapped = false;

  /** Independent eye life: pupils dart quickly while the sockets lag behind. */
  private readonly leftPupilX = new SpringAxis();
  private readonly leftPupilY = new SpringAxis();
  private readonly rightPupilX = new SpringAxis();
  private readonly rightPupilY = new SpringAxis();
  private readonly pupilScale = new SpringAxis(1);
  private readonly leftLidBias = new SpringAxis();
  private readonly rightLidBias = new SpringAxis();
  private faceStyle: number = FACE_STYLE.CONTENT;
  private leftEyeStyle: number = -1;
  private rightEyeStyle: number = -1;

  /**
   * Emotional body posture (Cherri Mind V4).
   *
   * Expressions carry a small sustained posture on existing springs:
   * happy lifts and puffs, sad and sleepy sag, angry compresses, curious leans in, shy withdraws.
   */
  private readonly posture = { lift: 0, puff: 0, depth: 0, lean: 0 };
  private postureLift = new SpringAxis();
  private posturePuff = new SpringAxis();
  private postureDepth = new SpringAxis();
  private postureLean = new SpringAxis();

  private massXTarget = 0;
  private massYTarget = 0;
  private massRotationTarget = 0;
  private massScaleYTarget = 0;
  private massSkewXTarget = 0;
  private massSkewYTarget = 0;
  private massOriginXTarget = 0;
  private massOriginYTarget = 0.82;
  private bodyStartedAt = 0;
  private bodyBaseTravelX = 0;
  private bodyBaseTravelY = 0;
  private bodyBaseRotation = 0;
  private bodyBaseScaleY = 0;

  private readonly delta: PoseDelta = { ...NEUTRAL_DELTA };
  private readonly mind = new BlobMind();

  /**
   * Mind V3 decides WHAT Cherri does; everything below this line still decides
   * HOW. The legacy BlobMind above is kept only for the Motion panel's manual
   * intention/destination overrides, which predate the director.
   */
  private readonly mindV3 = new CherriMind();
  private plan: MindPlan | null = null;
  private planStartedAt = 0;
  private planCursor = 0;
  private primitiveId: PrimitiveId | null = null;
  private primitiveStartedAt = -1;
  private primitiveAmount = 1;
  private primitiveDir = 0;
  private readonly primitiveFrame: BodyFrame = { ...ZERO_FRAME };
  private readonly primitiveScratch: BodyFrame = { ...ZERO_FRAME };
  private mindIntentionOverride: BlobIntention | null = null;
  private mindDestinationOverride: BlobDestination | null = null;
  private mindDepthOverride: number | null = null;
  private mindStoryRequestPending = false;
  private currentStory: MindStory | null = null;
  private lastStoryId = "SETTLE_CENTER";
  private lastIntention: BlobIntention = "REST";
  private lastDestination: BlobDestination = "CENTER";
  private storyMoveAt = 0;
  private storyMoveApplied = false;
  // Layered spatial coordinates:
  // 1. World navigation (owned strictly by spatial destination travel)
  private worldXTarget = 0;
  private worldYTarget = 0;
  private worldDepthTarget = 0;
  private worldRotationTarget = 0;

  // 2. Local body deformation & hop/squish offsets (owned by body beats/phrases)
  private localBodyX = 0;
  private localBodyY = 0;
  private localBodyRotation = 0;
  private localBodyScaleY = 0;

  // 3. Special entrance/exit offsets
  private specialX = 0;
  private specialY = 0;

  // 4. Decoupled 3D orientation & transit dynamics
  private travelYawTarget = 0;
  private travelPitchTarget = 0;
  private targetBaseYaw = 0;
  private targetBasePitch = 0;
  private travelPeakYaw = 0;
  private travelPeakPitch = 0;
  private transitYaw = 0;
  private transitPitch = 0;
  private activeFacingIntent: FacingIntent = "FORWARD";
  private currentYawSource: YawSource = "NEUTRAL";
  private storyHoldsFacing = false;

  get travelXTarget(): number {
    return this.worldXTarget + this.localBodyX;
  }
  set travelXTarget(val: number) {
    this.worldXTarget = val;
  }
  get travelYTarget(): number {
    return this.worldYTarget + this.localBodyY;
  }
  set travelYTarget(val: number) {
    this.worldYTarget = val;
  }
  get travelDepthTarget(): number {
    return this.worldDepthTarget;
  }
  set travelDepthTarget(val: number) {
    this.worldDepthTarget = val;
  }
  get travelRotationTarget(): number {
    return this.worldRotationTarget + this.localBodyRotation;
  }
  set travelRotationTarget(val: number) {
    this.worldRotationTarget = val;
  }
  get travelScaleYTarget(): number {
    return this.localBodyScaleY;
  }
  set travelScaleYTarget(val: number) {
    this.localBodyScaleY = val;
  }

  // Spatial travel interpolation & 3D buoyant arc
  private travelProgress = 1;
  private travelDuration = 800;
  private travelStartX = 0;
  private travelStartY = 0;
  private travelStartYaw = 0;
  private travelStartPitch = 0;
  private travelStartDepth = 0;
  private travelTargetX = 0;
  private travelTargetY = 0;
  private travelTargetYaw = 0;
  private travelTargetPitch = 0;
  private travelTargetDepth = 0;
  private travelProfile: MovementProfile = "REST";
  private travelMode: MovementMode = "STAY";
  private travelReturnPolicy: ReturnPolicy = "HOLD";
  private currentSpatialZone: BlobDestination = "CENTER";
  private targetSpatialZone: BlobDestination = "CENTER";
  private forcedPlanRequested = false;
  private manualPlanActive = false;
  private manualPlanUntil = 0;

  reset() {
    this.clock = 0;
    this.initialized = false;
    this.autoWasEnabled = true;
    this.forcedPlanRequested = false;
    this.manualPlanActive = false;
    this.manualPlanUntil = 0;
    this.rand = mulberry32(0x1a11ee);
    this.mind.reset();
    this.mindV3.reset();
    this.clearPlan();
    this.mindIntentionOverride = null;
    this.mindDestinationOverride = null;
    this.mindDepthOverride = null;
    this.mindStoryRequestPending = false;
    this.currentStory = null;
    this.lastStoryId = "SETTLE_CENTER";
    this.lastIntention = "REST";
    this.lastDestination = "CENTER";
    this.storyMoveAt = 0;
    this.storyMoveApplied = false;
    this.mood = "CONTENT";
    this.lastMood = "CONTENT";
    this.nextMoodAt = 0;
    this.nextMicroAt = 0;
    this.nextGazeAt = 0;
    this.nextBlinkAt = 0;
    this.nextExpressionAt = 0;
    this.nextMouthAt = 0;
    this.nextBodyAt = 0;
    this.nextBeatAt = 0;
    this.clearBeatCues();
    this.gazeAction = "RESTING";
    this.lidAction = "OPEN";
    this.mouthAction = "SMILE";
    this.bodyAction = "SUSPENDED";
    this.gazeReleaseAt = 0;
    this.expressionReleaseAt = 0;
    this.mouthReleaseAt = 0;
    this.bodyReleaseAt = 0;
    this.followAt = 0;
    this.followReleaseAt = 0;
    this.followXTarget = 0;
    this.followRotationTarget = 0;
    this.followScaleYTarget = 0;
    this.worldXTarget = 0;
    this.worldYTarget = 0;
    this.worldRotationTarget = 0;
    this.worldDepthTarget = 0;
    this.localBodyX = 0;
    this.localBodyY = 0;
    this.localBodyRotation = 0;
    this.localBodyScaleY = 0;
    this.specialX = 0;
    this.specialY = 0;
    this.travelYawTarget = 0;
    this.travelPitchTarget = 0;
    this.targetBaseYaw = 0;
    this.targetBasePitch = 0;
    this.travelPeakYaw = 0;
    this.travelPeakPitch = 0;
    this.transitYaw = 0;
    this.transitPitch = 0;
    this.activeFacingIntent = "FORWARD";
    this.currentYawSource = "NEUTRAL";
    this.storyHoldsFacing = false;
    this.travelProgress = 1;
    this.travelDuration = 800;
    this.travelStartX = 0;
    this.travelStartY = 0;
    this.travelStartYaw = 0;
    this.travelStartPitch = 0;
    this.travelStartDepth = 0;
    this.travelTargetX = 0;
    this.travelTargetY = 0;
    this.travelTargetYaw = 0;
    this.travelTargetPitch = 0;
    this.travelTargetDepth = 0;
    this.travelProfile = "REST";
    this.travelMode = "STAY";
    this.travelReturnPolicy = "HOLD";
    this.currentSpatialZone = "CENTER";
    this.targetSpatialZone = "CENTER";
    this.spinStartedAt = -1;
    this.spinRotation = 0;
    this.impactAt = 0;
    this.impactDirection = 0;
    this.specialAction = null;
    this.lastIdleGaze = null;
    this.specialStartedAt = -1;
    this.specialEmoteStarted = false;
    this.specialScale = 0;
    this.specialOpacity = 1;
    this.specialDirection = 1;
    this.activityId = "REST";
    this.activityStartedAt = 0;
    this.activityUntil = 0;
    this.blinkStartedAt = -1;
    this.blinkDouble = false;
    this.blinkLid = 1;
    this.blinkState = "open";
    this.baseGazeX = 0;
    this.baseGazeY = 0;
    this.microX = 0;
    this.microY = 0;
    this.leftX.reset();
    this.leftY.reset();
    this.rightX.reset();
    this.rightY.reset();
    this.leftScaleX.reset();
    this.leftScaleY.reset();
    this.rightScaleX.reset();
    this.rightScaleY.reset();
    this.leftRotation.reset();
    this.rightRotation.reset();
    this.leftBrowRotation.reset();
    this.rightBrowRotation.reset();
    this.leftTension.reset(1);
    this.rightTension.reset(1);
    this.mouthX.reset();
    this.mouthY.reset();
    this.mouthScaleX.reset();
    this.mouthScaleY.reset();
    this.mouthRotation.reset();
    this.mouthCurve.reset(0.82);
    this.mouthO.reset();
    this.mouthD.reset();
    this.mouthCrescent.reset();
    this.mouthOpacityValue = 1;
    this.mouthTurnStartedAt = -1;
    this.mouthTurnTarget = 0;
    this.mouthTurnSnapped = false;
    this.leftPupilX.reset();
    this.leftPupilY.reset();
    this.rightPupilX.reset();
    this.rightPupilY.reset();
    this.pupilScale.reset(1);
    this.leftLidBias.reset();
    this.rightLidBias.reset();
    this.faceStyle = FACE_STYLE.CONTENT;
    this.leftEyeStyle = -1;
    this.rightEyeStyle = -1;
    this.postureLift.reset();
    this.posturePuff.reset();
    this.postureDepth.reset();
    this.postureLean.reset();
    this.posture.lift = this.posture.puff = this.posture.depth = this.posture.lean = 0;
    this.bodyStartedAt = 0;
    this.bodyBaseTravelX = 0;
    this.bodyBaseTravelY = 0;
    this.bodyBaseRotation = 0;
    this.bodyBaseScaleY = 0;
    this.clearBodyTargets();
    this.applyMoodTargets();
    Object.assign(this.delta, NEUTRAL_DELTA);
  }

  /* ------------------------------------------------------------- mind V3 */

  /** Feeds one context event to the director. Safe to call from any frame. */
  notify(event: MindEvent) {
    this.mindV3.push(event);
  }

  /** The high-level intent door for a future phone or cloud model. */
  requestIntent(intent: MindIntent) {
    this.mindV3.request(intent);
  }

  /** Mind Lab: push the drives to a named mood preset. */
  forceMindMood(mood: string) {
    this.mindV3.forceMood(mood);
  }

  /** Mind Lab / Playground: play one authored story by id, bypassing scoring. Returns false if not found. */
  playStory(storyId: string): boolean {
    if (storyId !== "DEMO_60S_ADORABILITY" && !STORY_BY_ID.has(storyId)) {
      console.warn(`[BehaviourController.playStory] Story not found in catalogue: "${storyId}"`);
      return false;
    }
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.manualPlanActive = true;
    const def = STORY_BY_ID.get(storyId);
    this.manualPlanUntil = this.clock + (def ? def.durationMs : 3000);
    this.mindV3.play(storyId);
    return true;
  }

  /** Acting Playground: play an arbitrary compiled plan directly with priority over autonomous decisions. */
  playPlan(
    plan: MindPlan,
    cfg: BehaviourConfig = { gazePx: 8, squash: 0.032, paceScale: 1, blinkIntervalMs: 3400 }
  ) {
    this.forcedPlanRequested = false;
    this.manualBeat = false;
    this.manualPlanActive = true;
    this.manualPlanUntil = this.clock + plan.durationMs;
    this.startPlan(plan, cfg);
  }

  /** Acting Playground: trigger a body primitive directly. Returns false if not found. */
  triggerPrimitive(id: PrimitiveId, amount: number = 1.0, dir: number = 0): boolean {
    if (!PRIMITIVES[id]) return false;
    this.startPrimitive(id, amount, dir);
    return true;
  }

  /** Checks if a forced manual performance or route is currently executing. */
  get isManualPlanRunning(): boolean {
    return this.manualPlanActive && this.clock < this.manualPlanUntil;
  }

  /** Acting Playground: step directly to the next phase timestamp in the active plan. */
  stepNextPhase() {
    if (!this.plan || this.planCursor >= this.plan.cues.length) return;
    const nextCue = this.plan.cues[this.planCursor];
    if (nextCue) {
      this.clock = this.planStartedAt + nextCue.atMs;
    }
  }

  /** Gets currently active MindPlan if any. */
  get activePlan(): MindPlan | null {
    return this.plan;
  }

  /** Mind Lab: skip the quiet gap and take the next autonomous decision. */
  thinkNow() {
    this.mindV3.thinkNow();
  }

  /** Mind Lab: simulate an absence so idle behaviour can be inspected. */
  skipQuiet(ms: number) {
    this.mindV3.fastForwardQuiet(ms);
    this.clearPlan();
  }

  /** Determinism hook: the same seed reproduces the same choices. */
  setMindSeed(seed: number) {
    this.reset();
    this.mindV3.setSeed(seed);
  }

  get mindSeed() {
    return this.mindV3.seed;
  }

  forceZone(zone: BlobDestination) {
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.mindV3.forceZone(zone);
  }

  forceWander() {
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.mindV3.forceWander();
  }

  returnCenter() {
    this.forceZone("CENTER");
  }

  resetSpatial() {
    this.clearPlan();
    this.mindV3.resetSpatial();
    this.applyDestination("CENTER", undefined, "REST", "STAY", "HOLD");
  }

  /* ------------------------------------- Mind V4 movement (dev controls) */

  /** Make the next autonomous decision a relocation, chosen by the mind. */
  forceNextMove() {
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.mindV3.forceNextMove();
  }

  /** The same, with the spatial urge pushed to the top of its range. */
  forceExplore() {
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.mindV3.forceExplore();
  }

  /** Drop the accumulated pressure to be somewhere else back to nothing. */
  resetSpatialUrge() {
    this.mindV3.resetSpatialUrge();
  }

  /** Dev-only global pacing scale for the movement system. */
  setMovementEnergy(level: MovementEnergy) {
    this.mindV3.setMovementEnergy(level);
  }

  get mindV4() {
    return this.mindV3;
  }

  moveToZone(zone: BlobDestination, policy: ReturnPolicy = "HOLD") {
    this.applyDestination(zone, undefined, "EXPLORE", "FLOAT", policy);
  }

  playAdorabilityDemo() {
    this.forcedPlanRequested = true;
    this.manualBeat = false;
    this.mindV3.forceStory("DEMO_60S_ADORABILITY");
  }

  mindTelemetry(): MindTelemetry {
    const base = this.mindV3.telemetry();
    return {
      ...base,
      currentZone: this.currentSpatialZone,
      targetZone: this.targetSpatialZone,
      movementMode: this.travelMode,
      movementProgress: this.travelProgress,
      movementProfile: this.travelProfile,
      returnPolicy: this.travelReturnPolicy,
      travelYawTarget: this.travelYawTarget,
      travelPitchTarget: this.travelPitchTarget,
      worldX: this.worldXTarget,
      worldY: this.worldYTarget,
      yawSource: this.currentYawSource,
      facingIntent: this.activeFacingIntent,
      targetX: this.travelTargetX,
      targetY: this.travelTargetY,
    };
  }

  setMood(mood: HomeMood | null) {
    if (!mood) {
      this.nextMoodAt = this.clock + 7000;
      return;
    }
    this.mood = mood;
    this.lastMood = mood;
    this.nextMoodAt = this.clock + 1000000000;
    if (this.expressionReleaseAt === 0) {
      this.applyMoodEyeTargets();
      this.applyMoodFace();
    }
    if (this.mouthReleaseAt === 0) this.applyMoodMouthTargets();
  }

  /** Changes the director's test overrides without restarting the render loop. */
  setMindOverrides(
    intention: BlobIntention | null,
    destination: BlobDestination | null,
    depth: number | null
  ) {
    if (
      intention === this.mindIntentionOverride &&
      destination === this.mindDestinationOverride &&
      depth === this.mindDepthOverride
    ) {
      return;
    }
    this.mindIntentionOverride = intention;
    this.mindDestinationOverride = destination;
    this.mindDepthOverride = depth;
    // A changed test target should be visible on the next tick, but an active
    // manual cue is left to its caller. Auto will choose the new story once.
    if (this.initialized) {
      this.mindStoryRequestPending = true;
      if (!this.manualBeat) {
        this.currentStory = null;
        this.storyMoveAt = 0;
        this.storyMoveApplied = false;
        this.nextBeatAt = this.clock;
      }
    }
  }

  /** Future device states can take over every channel from the current pose. */
  cancel() {
    this.clearBeatCues();
    this.forcedPlanRequested = false;
    this.manualPlanActive = false;
    this.manualPlanUntil = 0;
    this.gazeReleaseAt = this.expressionReleaseAt = this.mouthReleaseAt = 0;
    this.applyPosture(null);
    this.bodyReleaseAt = this.followAt = this.followReleaseAt = 0;
    this.baseGazeX = this.baseGazeY = this.microX = this.microY = 0;
    this.mouthOpacityValue = 1;
    this.mouthTurnStartedAt = -1;
    this.mouthTurnTarget = 0;
    this.mouthTurnSnapped = false;
    this.retargetEyes();
    this.clearBodyTargets();
    this.mood = "CONTENT";
    this.currentStory = null;
    this.mindStoryRequestPending = false;
    this.lastIntention = "REST";
    this.lastDestination = "CENTER";
    this.storyMoveAt = 0;
    this.storyMoveApplied = false;
    this.worldXTarget = 0;
    this.worldYTarget = 0;
    this.worldRotationTarget = 0;
    this.worldDepthTarget = 0;
    this.localBodyX = 0;
    this.localBodyY = 0;
    this.localBodyRotation = 0;
    this.localBodyScaleY = 0;
    this.specialX = 0;
    this.specialY = 0;
    this.travelYawTarget = 0;
    this.travelPitchTarget = 0;
    this.targetBaseYaw = 0;
    this.targetBasePitch = 0;
    this.travelPeakYaw = 0;
    this.travelPeakPitch = 0;
    this.transitYaw = 0;
    this.transitPitch = 0;
    this.activeFacingIntent = "FORWARD";
    this.currentYawSource = "NEUTRAL";
    this.storyHoldsFacing = false;
    this.spinStartedAt = -1;
    this.spinRotation = 0;
    this.impactAt = 0;
    this.impactDirection = 0;
    this.specialAction = null;
    this.specialStartedAt = -1;
    this.specialEmoteStarted = false;
    this.specialScale = 0;
    this.specialOpacity = 1;
    this.applyMoodTargets();
    this.activityId = "REST";
    this.activityUntil = this.clock;
    this.nextBeatAt = this.clock + 900;
  }

  trigger(id: BehaviourId, cfg: BehaviourConfig) {
    this.ensureSchedule(cfg);
    this.clearBeatCues();
    if (id === "REST") {
      this.cancel();
      return;
    }
    // A click can arrive between React's Auto toggle render and the next
    // animation tick. Keep this direct cue alive through that transition;
    // Auto only controls the seeded playlist, never manual inspection.
    this.manualBeat = true;
    if (id === "SPIN_360") {
      this.startSpin();
      return;
    }
    if (
      id === "CREEP_IN_LEFT" ||
      id === "CREEP_IN_RIGHT" ||
      id === "POP_OUT_IN" ||
      id === "VANISH_REAPPEAR"
    ) {
      this.startSpecial(id, cfg);
      return;
    }
    if (id === "WALL_IMPACT_LEFT" || id === "WALL_IMPACT_RIGHT") {
      this.startWallImpact(id, cfg);
      return;
    }
    if (id === "NORMAL_BLINK" || id === "DOUBLE_BLINK") {
      this.startBlink(id === "DOUBLE_BLINK", cfg);
      return;
    }
    if (
      id === "GLANCE_LEFT" ||
      id === "GLANCE_RIGHT" ||
      id === "LOOK_UP" ||
      id === "LOOK_DOWN" ||
      id === "CURIOUS_TILT_LEFT" ||
      id === "CURIOUS_TILT_RIGHT"
    ) {
      this.startGaze(id, cfg);
      return;
    }
    if (
      id === "SOFT_SQUINT" ||
      id === "ONE_EYE_SQUINT_LEFT" ||
      id === "ONE_EYE_SQUINT_RIGHT" ||
      id === "CURIOUS_WIDE" ||
      id === "ANGRY_BROWS" ||
      id === "HAPPY_EYES" ||
      id === "EXCITED_EYES" ||
      id === "ANGRY_EYES" ||
      id === "SHY_EYES" ||
      id === "SLEEPY_EYES" ||
      id === "SAD_EYES" ||
      id === "CONFUSED_EYES" ||
      id === "LOVE_EYES" ||
      id === "PANIC_EYES" ||
      id === "DEADPAN_EYES"
    ) {
      this.startExpression(id);
      return;
    }
    if (
      id === "MOUTH_RELAX" ||
      id === "MOUTH_TWITCH" ||
      id === "MOUTH_O" ||
      id === "MOUTH_FLIP"
    ) {
      this.startMouth(id);
      return;
    }
    if (id === "SENSED_WORRIED" || id === "SENSED_SURPRISED") {
      this.startSensedVariant(id, cfg);
      return;
    }
    if (
      id === "ANGRY_STARE" ||
      id === "ANGRY_SQUINT" ||
      id === "ANGRY_TILT" ||
      id === "SAD_DOWNCAST" ||
      id === "SAD_WOBBLE" ||
      id === "SAD_SMALL" ||
      id === "IDLE_SOFT_BREATH" ||
      id === "IDLE_LOOK_AROUND" ||
      id === "IDLE_SETTLE" ||
      id === "HAPPY_BOUNCE" ||
      id === "SHOCKED_RECOIL" ||
      id === "CONFUSED_TILT" ||
      id === "SLEEPY_MELT" ||
      id === "LAUGH_SQUISH" ||
      id === "PLAYFUL_WINK" ||
      id === "PANIC_SHAKE" ||
      id === "PROUD_STRETCH" ||
      id === "CASUAL_SQUINT" ||
      id === "LAZY_LOOK" ||
      id === "SOFT_SIGH" ||
      id === "JOY_HOP" ||
      id === "EXCITED_WIGGLE" ||
      id === "CURIOUS_DOUBLE_TAKE" ||
      id === "SHY_PEEK" ||
      id === "EMBARRASSED_BLUSH" ||
      id === "SLEEPY_YAWN" ||
      id === "DEADPAN_SIDE_EYE" ||
      id === "ANGRY_FLARE" ||
      id === "DIZZY_WOBBLE" ||
      id === "LOVE_SPARKLE" ||
      id === "SURPRISE_POP" ||
      id === "TEARY_POUT"
    ) {
      this.startLibraryBeat(id, cfg);
      return;
    }
    this.startBody(id, cfg);
  }

  /**
   * Advance the presentation every frame. `autoEnabled` only gates the seeded
   * playlist; direct trigger() calls and any active spring are always allowed
   * to finish, which keeps manual cue inspection useful.
   */
  update(dtMs: number, cfg: BehaviourConfig, autoEnabled = true) {
    this.ensureSchedule(cfg);
    this.clock += Math.max(0, dtMs);

    this.updateSpecial();
    this.updateStoryTravel();
    this.updateSpin();
    this.updateBodyBeat();
    if (this.impactAt > 0 && this.clock >= this.impactAt) {
      this.impactAt = 0;
      this.localBodyX = this.impactDirection * -4.5;
      this.localBodyRotation = this.impactDirection * -5.2;
      this.massXTarget = this.impactDirection * -3.2;
      this.massRotationTarget = this.impactDirection * -5.4;
      this.localBodyY = 4.8;
      this.localBodyScaleY = -0.145;
      this.massYTarget = 3.7;
      this.massScaleYTarget = -0.105;
      this.massSkewYTarget = this.impactDirection * 3.2;
    }

    if (!autoEnabled && this.autoWasEnabled && !this.manualBeat)
      this.clearBeatCues();
    if (autoEnabled && !this.autoWasEnabled) this.resumeAutomaticSchedule(cfg);
    this.autoWasEnabled = autoEnabled;

    if (this.gazeReleaseAt > 0 && this.clock >= this.gazeReleaseAt) {
      this.gazeReleaseAt = 0;
      this.baseGazeX = 0;
      this.baseGazeY = 0;
      this.gazeAction = "RESTING";
      this.retargetEyes();
    }
    if (this.expressionReleaseAt > 0 && this.clock >= this.expressionReleaseAt) {
      this.expressionReleaseAt = 0;
      this.lidAction = "MOOD";
      this.applyPosture(null);
      this.applyMoodEyeTargets();
      this.applyMoodFace();
    }
    if (this.mouthReleaseAt > 0 && this.clock >= this.mouthReleaseAt) {
      this.mouthReleaseAt = 0;
      this.mouthAction = "MOOD";
      this.applyMoodMouthTargets();
    }
    if (this.bodyReleaseAt > 0 && this.clock >= this.bodyReleaseAt) {
      if (this.bodyAction === "CURIOUS_DOUBLE_TAKE") {
        this.baseGazeX = 0;
        this.baseGazeY = 0;
        this.retargetEyes();
      }
      this.bodyReleaseAt = 0;
      this.bodyAction = "SETTLING";
      this.clearBodyTargets();
    }
    if (this.followAt > 0 && this.clock >= this.followAt) {
      this.followAt = 0;
      this.followReleaseAt = this.clock + 520;
    }
    if (this.followReleaseAt > 0 && this.clock >= this.followReleaseAt) {
      this.followReleaseAt = 0;
      this.followXTarget = 0;
      this.followRotationTarget = 0;
      this.followScaleYTarget = 0;
    }

    if (this.mindStoryRequestPending && !this.manualBeat) {
      this.mindStoryRequestPending = false;
      this.pickMindStory(cfg);
      // Treat an explicit director selection like a manual preview so it also
      // works while the seeded Auto playlist is switched off.
      this.manualBeat = true;
    }

    // Manual preview cues must continue even when Auto is off. The old gate
    // here made staged expression beats silently freeze halfway through.
    this.runBeatCues(cfg);
    this.runMind(dtMs, cfg, autoEnabled);
    this.runPlanCues(cfg);
    this.updateTravel(dtMs);

    if (autoEnabled) {
      // Legacy mood picking only runs when Motion tab overrides are active.
      // In normal operation, Mind V3 owns character mood and intention.
      if (this.overridesActive() && this.clock >= this.nextMoodAt) {
        this.pickMood(cfg);
      }
      if (this.plan === null && this.clock >= this.nextMicroAt) this.pickMicro(cfg);
      if (
        this.overridesActive() &&
        this.clock >= this.nextBeatAt &&
        this.beatUntil === 0 &&
        this.specialAction === null
      )
        this.pickMindStory(cfg);
      // Between stories Blob looks around on his own.
      // Stand down completely while Mind V3 is actively running a plan.
      if (
        this.overridesActive() &&
        this.clock >= this.nextGazeAt &&
        this.gazeReleaseAt === 0 &&
        this.beatUntil === 0 &&
        this.specialAction === null &&
        this.plan === null
      )
        this.pickIdleGaze(cfg);
      if (this.clock >= this.nextBlinkAt && this.blinkStartedAt < 0)
        this.startBlink(this.rand() < 0.14, cfg);
    }

    this.updateBlink();
    this.updateMouthTurn();
    this.updatePrimitive();
    this.stepFaceSprings(dtMs);
  }

  /**
   * The director runs every frame but only thinks at its own low rate. Its
   * output is a plan; a plan is a list of cues this class already knows how to
   * execute, so nothing about the animation layer had to change to gain a
   * personality.
   */
  private runMind(dtMs: number, cfg: BehaviourConfig, autoEnabled: boolean) {
    // If a manual plan is actively running and hasn't finished its duration,
    // lock out autonomous decisions so Cherri's manual performance is never cut short.
    if (this.manualPlanActive) {
      if (this.clock < this.manualPlanUntil) {
        if (!this.forcedPlanRequested) {
          return;
        }
      } else {
        this.manualPlanActive = false;
      }
    }

    // Do not spend thoughts/cooldowns on performances that cannot execute.
    if ((!autoEnabled && !this.forcedPlanRequested && !this.plan) ||
        this.manualBeat || this.overridesActive()) return;
    const next = this.mindV3.tick(dtMs, autoEnabled || this.forcedPlanRequested);
    const mood = this.mindV3.mood;
    if (mood !== this.mood) this.setMood(mood);
    if (!next) return;
    const isForced = this.forcedPlanRequested;
    this.forcedPlanRequested = false;
    // Manual inspection, the legacy Motion overrides, and a running special
    // action all outrank the director. Dropping the plan is safe: the mind has
    // already scheduled when it will think again.
    if ((!autoEnabled && !isForced) || this.manualBeat || this.overridesActive()) return;
    if (isForced) {
      this.manualPlanActive = true;
      this.manualPlanUntil = this.clock + next.durationMs;
    }
    this.startPlan(next, cfg);
  }

  private overridesActive() {
    return (
      this.mindIntentionOverride !== null ||
      this.mindDestinationOverride !== null ||
      this.mindDepthOverride !== null
    );
  }

  private clearPlan() {
    this.plan = null;
    this.planCursor = 0;
    this.planStartedAt = 0;
    this.manualPlanActive = false;
    this.manualPlanUntil = 0;
    this.primitiveId = null;
    this.primitiveStartedAt = -1;
    Object.assign(this.primitiveFrame, ZERO_FRAME);
  }

  private startPlan(plan: MindPlan, cfg: BehaviourConfig) {
    // A micro-life cue must never wipe an authored performance mid-phrase.
    if (
      this.plan &&
      plan.category === "MICRO" &&
      this.clock < this.planStartedAt + this.plan.durationMs
    ) {
      return;
    }
    // An active manual performance must never be overwritten mid-phrase.
    if (
      this.plan &&
      this.manualPlanActive &&
      this.clock < this.manualPlanUntil &&
      !this.forcedPlanRequested
    ) {
      return;
    }
    this.clearBeatCues();
    this.plan = plan;
    this.planStartedAt = this.clock;
    this.planCursor = 0;
    this.lastStoryId = plan.storyId;
    this.lastIntention = plan.intention;
    this.lastDestination = plan.destination;
    this.beatUntil = this.clock + plan.durationMs;
    this.activityId = this.primaryOf(plan);
    this.activityStartedAt = this.clock;
    this.activityUntil = this.beatUntil;
    // Idle scheduling stands down for the length of the performance so a free
    // glance never cuts across an authored one.
    this.nextBeatAt = this.beatUntil + this.interval(400, 900, cfg);
    this.nextGazeAt = this.nextBeatAt;

    // Compiler owns all journeys. Never infer travel from plan metadata.
    if (plan.facing) this.applyFacing(plan.facing, !!plan.holdFacing);
    if (plan.category === "INTERACTION") {
      this.travelProgress = 1;
      this.transitYaw = 0;
      this.transitPitch = 0;
      this.travelTargetX = this.worldXTarget;
      this.travelTargetY = this.worldYTarget;
    }

    this.runPlanCues(cfg);
  }

  /** A readable id for the activity readout: the first real body cue. */
  private primaryOf(plan: MindPlan): BehaviourId {
    for (const cue of plan.cues) {
      if (cue.body) return cue.body;
      if (cue.special && cue.special !== "SPIN_360") return cue.special;
      if (cue.special === "SPIN_360") return "SPIN_360";
    }
    for (const cue of plan.cues) {
      if (cue.gaze) return cue.gaze;
      if (cue.expression) return cue.expression;
    }
    return "REST";
  }

  private runPlanCues(cfg: BehaviourConfig) {
    const plan = this.plan;
    if (!plan) return;
    const elapsed = this.clock - this.planStartedAt;
    while (
      this.planCursor < plan.cues.length &&
      plan.cues[this.planCursor].atMs <= elapsed
    ) {
      const cue = plan.cues[this.planCursor];
      this.planCursor += 1;
      this.applyCue(cue, cfg);
    }
    if (elapsed >= plan.durationMs && this.planCursor >= plan.cues.length) {
      this.onPlanCompleted(plan);
      this.plan = null;
      this.manualPlanActive = false;
      this.manualPlanUntil = 0;
      if (this.beatUntil <= this.clock) this.beatUntil = 0;
    }
  }

  private onPlanCompleted(plan: MindPlan) {
    // Notify MindV3 memory that the plan finished in the destination zone
    this.mindV3.observeZone(this.currentSpatialZone);

    const policy = plan.returnPolicy ?? this.travelReturnPolicy;
    if (policy === "RETURN") {
      if (this.currentSpatialZone !== "CENTER") {
        this.applyDestination("CENTER", undefined, "DRIFT", "FLOAT", "HOLD");
      }
    } else if (policy === "BOUNCE") {
      this.applyDestination("CENTER", undefined, "DART", "FLOAT", "HOLD");
    } else if (policy === "HOLD" || policy === "HOLD_BRIEFLY") {
      // Hold position in current zone
    }

    // Default arrival facing MUST decay back to 0 degrees (neutral viewer-facing),
    // unless the plan explicitly requests holding facing.
    if (!plan.holdFacing) {
      this.targetBaseYaw = 0;
      this.targetBasePitch = 0;
      this.storyHoldsFacing = false;
      this.activeFacingIntent = "FORWARD";
    }
  }

  private applyCue(cue: MindCue, cfg: BehaviourConfig) {
    if (cue.destination) {
      this.applyDestination(
        cue.destination,
        cue.depth,
        cue.movementProfile ?? this.plan?.movementProfile ?? "EXPLORE",
        cue.movementMode ?? this.plan?.movementMode ?? "FLOAT",
        cue.returnPolicy ?? this.plan?.returnPolicy ?? "HOLD",
        cue.facing ?? this.plan?.facing
      );
    } else if (cue.depth !== undefined) {
      this.worldDepthTarget = clamp(cue.depth, -0.2, 0.2);
    }
    if (cue.movementMode === "STAY" && !cue.destination) {
      this.travelProgress = 1;
      this.travelTargetX = this.worldXTarget;
      this.travelTargetY = this.worldYTarget;
      this.transitYaw = 0;
      this.transitPitch = 0;
    }
    if (cue.facing) {
      this.applyFacing(cue.facing, !!cue.holdFacing);
    }
    if (cue.gaze) this.startGaze(cue.gaze, cfg);
    if (cue.expression) this.startExpression(cue.expression);
    if (cue.mouth) this.startMouth(cue.mouth);
    if (cue.body) this.startBody(cue.body, cfg);
    if (cue.special === "SPIN_360") this.startSpin();
    else if (cue.special) this.startSpecial(cue.special, cfg);
    if (cue.primitive) this.startPrimitive(cue.primitive, cue.amount ?? 1, cue.dir ?? 0);
    if (cue.blink && this.blinkStartedAt < 0) this.startBlink(false, cfg);
  }

  private applyFacing(facing: FacingIntent, holdFacing = false) {
    this.activeFacingIntent = facing;
    this.storyHoldsFacing = holdFacing;
    switch (facing) {
      case "FORWARD":
        this.targetBaseYaw = 0;
        this.targetBasePitch = 0;
        this.currentYawSource = "NEUTRAL";
        break;
      case "LOOK_LEFT":
        this.targetBaseYaw = -14;
        this.targetBasePitch = 0;
        this.currentYawSource = "STORY";
        break;
      case "LOOK_RIGHT":
        this.targetBaseYaw = 14;
        this.targetBasePitch = 0;
        this.currentYawSource = "STORY";
        break;
      case "LOOK_UP":
        this.targetBaseYaw = 0;
        this.targetBasePitch = -10;
        this.currentYawSource = "STORY";
        break;
      case "LOOK_DOWN":
        this.targetBaseYaw = 0;
        this.targetBasePitch = 8;
        this.currentYawSource = "STORY";
        break;
      case "FACE_TRAVEL":
        this.targetBaseYaw = 0;
        this.targetBasePitch = 0;
        this.currentYawSource = "VELOCITY";
        break;
      case "FACE_TARGET": {
        const destPose = DESTINATION_POSES[this.targetSpatialZone];
        const dx = destPose.x - this.worldXTarget;
        this.targetBaseYaw = Math.sign(dx) * Math.min(14, Math.abs(dx) * 0.14);
        this.targetBasePitch = 0;
        this.currentYawSource = "STORY";
        break;
      }
    }
  }

  /** Retargets the character with spatial arc and physical timing. */
  private applyDestination(
    destination: BlobDestination,
    depth?: number,
    profile: MovementProfile = "EXPLORE",
    mode: MovementMode = "FLOAT",
    returnPolicy: ReturnPolicy = "HOLD",
    facingIntent?: FacingIntent
  ) {
    const pose = DESTINATION_POSES[destination];
    this.targetSpatialZone = destination;
    this.travelProfile = profile;
    this.travelMode = mode;
    this.travelReturnPolicy = returnPolicy;
    this.lastDestination = destination;

    this.travelStartX = this.worldXTarget;
    this.travelStartY = this.worldYTarget;
    this.travelStartYaw = this.travelYawTarget;
    this.travelStartPitch = this.travelPitchTarget;
    this.travelStartDepth = this.worldDepthTarget;

    this.travelTargetX = pose.x;
    this.travelTargetY = pose.y;
    this.travelTargetDepth = clamp(depth ?? pose.depth, -0.2, 0.2);

    const dx = this.travelTargetX - this.travelStartX;
    const dy = this.travelTargetY - this.travelStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Compute peak dynamic transit yaw based on velocity/direction:
    // Yaw turns smoothly into the direction of motion during travel,
    // peaking mid-transit and decaying back to 0° upon arrival.
    if (Math.abs(dx) > 4) {
      const peakYawMagnitude = Math.min(15, Math.abs(dx) * 0.15);
      this.travelPeakYaw = Math.sign(dx) * Math.max(6, peakYawMagnitude);
      this.currentYawSource = "VELOCITY";
    } else {
      this.travelPeakYaw = 0;
    }

    if (Math.abs(dy) > 10) {
      this.travelPeakPitch = Math.sign(dy) * Math.min(8, Math.abs(dy) * 0.08);
    } else {
      this.travelPeakPitch = 0;
    }

    if (facingIntent) {
      this.applyFacing(facingIntent, this.storyHoldsFacing);
    } else if (!this.storyHoldsFacing) {
      this.targetBaseYaw = 0;
      this.targetBasePitch = 0;
      this.activeFacingIntent = "FORWARD";
      if (this.travelPeakYaw === 0) {
        this.currentYawSource = "NEUTRAL";
      }
    }

    if (dist < 1) {
      this.currentSpatialZone = destination;
      this.worldXTarget = this.travelTargetX;
      this.worldYTarget = this.travelTargetY;
      this.worldDepthTarget = this.travelTargetDepth;
      this.travelProgress = 1;
      this.transitYaw = 0;
      this.transitPitch = 0;
      if (!this.storyHoldsFacing) {
        this.targetBaseYaw = 0;
        this.targetBasePitch = 0;
      }
      return;
    }

    let duration: number;
    switch (profile) {
      case "PLAY":
      case "STARTLED":
      case "DART":
        duration = Math.max(380, dist * 3.2);
        break;
      case "TIPTOE":
        duration = Math.max(750, dist * 6.5);
        break;
      case "SLEEPY":
        duration = Math.max(1800, dist * 15);
        break;
      case "SHY":
      case "INSPECT":
      case "SNEAK":
        duration = Math.max(900, dist * 7.8);
        break;
      case "AFFECTION":
      case "DRIFT":
        duration = Math.max(700, dist * 5.8);
        break;
      case "FLOAT":
      case "EXPLORE":
      default:
        duration = Math.max(500, dist * 4.6);
        break;
    }
    this.travelDuration = clamp(duration, 350, 2400);
    this.travelProgress = 0;
  }

  private updateTravel(dtMs: number) {
    const dt = Math.max(0, Math.min(dtMs, 100));

    if (this.travelProgress < 1) {
      this.travelProgress = Math.min(1, this.travelProgress + dt / this.travelDuration);
      const t = this.travelProgress;

      // Profile-based easing
      let easedT: number;
      if (this.travelProfile === "DART") {
        easedT = 1 - Math.pow(1 - t, 2.5);
      } else {
        easedT = t * t * (3 - 2 * t);
      }

      // Buoyant vertical lift arc: wafts up during travel, settles down at destination
      let liftAmplitude = 0;
      if (this.travelMode === "FLOAT" || this.travelMode === "DRIFT") {
        liftAmplitude = 16;
      } else if (this.travelProfile === "DART") {
        liftAmplitude = 9;
      } else if (this.travelProfile === "SNEAK" || this.travelProfile === "TIPTOE") {
        liftAmplitude = 6;
      } else if (this.travelProfile !== "REST") {
        liftAmplitude = 12;
      }
      const liftOffset = -liftAmplitude * Math.sin(Math.PI * t);

      // Bell curve for transit yaw: rises dynamically into travel direction mid-transit
      const transitBell = Math.pow(Math.sin(Math.PI * t), 0.85);
      this.transitYaw = this.travelPeakYaw * transitBell;
      this.transitPitch = this.travelPeakPitch * transitBell;

      this.worldXTarget = mix(this.travelStartX, this.travelTargetX, easedT);
      this.worldYTarget = mix(this.travelStartY, this.travelTargetY, easedT) + liftOffset;
      this.worldDepthTarget = mix(this.travelStartDepth, this.travelTargetDepth, easedT);

      this.travelYawTarget = mix(this.travelStartYaw, this.targetBaseYaw, easedT) + this.transitYaw;
      this.travelPitchTarget = mix(this.travelStartPitch, this.targetBasePitch, easedT) + this.transitPitch;
      this.worldRotationTarget = this.travelYawTarget * 0.14;

      if (this.travelProgress >= 1) {
        this.currentSpatialZone = this.targetSpatialZone;
        this.worldXTarget = this.travelTargetX;
        this.worldYTarget = this.travelTargetY;
        this.worldDepthTarget = this.travelTargetDepth;
        this.transitYaw = 0;
        this.transitPitch = 0;
        if (!this.storyHoldsFacing) {
          this.targetBaseYaw = 0;
          this.targetBasePitch = 0;
        }
      }
    }

    // Exponential decay towards targetBaseYaw (settles to 0° neutral viewer-facing)
    if (this.travelProgress >= 1) {
      const decayRate = 1 - Math.exp(-dt / 180);
      this.travelYawTarget = mix(this.travelYawTarget, this.targetBaseYaw, decayRate);
      this.travelPitchTarget = mix(this.travelPitchTarget, this.targetBasePitch, decayRate);
      if (Math.abs(this.travelYawTarget - this.targetBaseYaw) < 0.05) {
        this.travelYawTarget = this.targetBaseYaw;
      }
      if (Math.abs(this.travelPitchTarget - this.targetBasePitch) < 0.05) {
        this.travelPitchTarget = this.targetBasePitch;
      }
      this.worldRotationTarget = this.travelYawTarget * 0.14;

      if (Math.abs(this.travelYawTarget) <= 0.1 && this.targetBaseYaw === 0) {
        this.currentYawSource = "NEUTRAL";
        this.activeFacingIntent = "FORWARD";
      }
    }
  }

  private startPrimitive(id: PrimitiveId, amount: number, dir: number) {
    this.primitiveId = id;
    this.primitiveStartedAt = this.clock;
    this.primitiveAmount = clamp(amount, 0, 1.6);
    this.primitiveDir = dir;
  }

  /**
   * Primitives are additive deltas sampled from a pure function, so they layer
   * on top of the existing spring targets rather than fighting them.
   */
  private updatePrimitive() {
    if (this.primitiveId === null || this.primitiveStartedAt < 0) {
      if (
        this.primitiveFrame.x !== 0 ||
        this.primitiveFrame.y !== 0 ||
        this.primitiveFrame.scale !== 0
      ) {
        Object.assign(this.primitiveFrame, ZERO_FRAME);
      }
      return;
    }
    const meta = PRIMITIVES[this.primitiveId];
    const t = (this.clock - this.primitiveStartedAt) / meta.durationMs;
    if (t >= 1) {
      this.primitiveId = null;
      this.primitiveStartedAt = -1;
      Object.assign(this.primitiveFrame, ZERO_FRAME);
      return;
    }
    const frame = samplePrimitive(
      this.primitiveId,
      t,
      this.primitiveAmount,
      this.primitiveDir,
      this.primitiveScratch
    );
    Object.assign(this.primitiveFrame, frame);
  }

  private ensureSchedule(cfg: BehaviourConfig) {
    if (this.initialized) return;
    this.initialized = true;
    this.nextMoodAt = 5600 + this.rand() * 2200;
    this.nextMicroAt = 260 + this.rand() * 280;
    this.nextBeatAt = 1100 + this.rand() * 900;
    this.nextGazeAt = this.nextBeatAt;
    this.nextExpressionAt = this.nextBeatAt;
    this.nextMouthAt = this.nextBeatAt;
    this.nextBodyAt = this.nextBeatAt;
    this.nextBlinkAt = this.clock + this.blinkGap(cfg);
    this.applyMoodTargets();
  }

  /** Start a fresh, non-backlogged playlist after manual inspection. */
  private resumeAutomaticSchedule(cfg: BehaviourConfig) {
    this.nextMoodAt = this.clock + this.interval(5200, 8200, cfg);
    this.nextMicroAt = this.clock + this.interval(350, 900, cfg);
    this.nextBeatAt = this.clock + this.interval(1000, 1700, cfg);
    this.nextGazeAt = this.nextBeatAt;
    this.nextExpressionAt = this.nextBeatAt;
    this.nextMouthAt = this.nextBeatAt;
    this.nextBodyAt = this.nextBeatAt;
    this.nextBlinkAt = this.clock + this.blinkGap(cfg);
  }

  private clearBeatCues() {
    this.beatUntil = 0;
    this.beatExpressionAt = 0;
    this.beatMouthAt = 0;
    this.beatBodyAt = 0;
    this.beatExpressionId = null;
    this.beatMouthId = null;
    this.beatBodyId = null;
    this.manualBeat = false;
    this.currentStory = null;
    this.storyMoveAt = 0;
    this.storyMoveApplied = false;
  }

  /** Deliver delayed cues in face-first, body-last order. */
  private runBeatCues(cfg: BehaviourConfig) {
    if (this.beatExpressionAt > 0 && this.clock >= this.beatExpressionAt) {
      const id = this.beatExpressionId;
      this.beatExpressionAt = 0;
      this.beatExpressionId = null;
      if (id) this.startExpression(id);
    }
    if (this.beatMouthAt > 0 && this.clock >= this.beatMouthAt) {
      const id = this.beatMouthId;
      this.beatMouthAt = 0;
      this.beatMouthId = null;
      if (id) this.startMouth(id);
    }
    if (this.beatBodyAt > 0 && this.clock >= this.beatBodyAt) {
      const id = this.beatBodyId;
      this.beatBodyAt = 0;
      this.beatBodyId = null;
      if (id) this.startBody(id, cfg);
    }
    if (
      this.beatUntil > 0 &&
      this.clock >= this.beatUntil &&
      this.beatExpressionAt === 0 &&
      this.beatMouthAt === 0 &&
      this.beatBodyAt === 0
    ) {
      this.beatUntil = 0;
      this.manualBeat = false;
      this.currentStory = null;
      this.storyMoveAt = 0;
      this.storyMoveApplied = false;
    }
  }

  /** Move the whole character only after the face has announced the thought. */
  private updateStoryTravel() {
    const story = this.currentStory;
    if (!story || this.storyMoveApplied || this.clock < this.storyMoveAt) return;
    this.worldXTarget = story.x;
    this.worldYTarget = story.y;
    // A small roll sells weight; yaw is rendered separately as depth.
    this.worldRotationTarget = story.yaw * 0.14;
    this.localBodyScaleY = 0;
    this.worldDepthTarget = story.depth;
    this.travelYawTarget = story.yaw;
    this.travelPitchTarget = story.pitch;
    this.storyMoveApplied = true;
  }

  /** Choose one intention-led thought and stage its channels as a story. */
  private pickMindStory(cfg: BehaviourConfig) {
    const next = this.mind.choose(
      this.mood,
      this.mindIntentionOverride,
      this.mindDestinationOverride,
      this.mindDepthOverride
    );
    this.currentStory = next;
    this.lastStoryId = next.id;
    this.lastIntention = next.intention;
    this.lastDestination = next.destination;
    this.storyMoveAt = this.clock + next.moveDelayMs;
    this.storyMoveApplied = false;
    this.beatExpressionAt = next.expression
      ? this.clock + next.expressionDelayMs
      : 0;
    this.beatMouthAt = next.mouth ? this.clock + next.mouthDelayMs : 0;
    this.beatBodyAt = next.body ? this.clock + next.bodyDelayMs : 0;
    this.beatExpressionId = next.expression;
    this.beatMouthId = next.mouth;
    this.beatBodyId = next.body;
    this.beatUntil = this.clock + next.durationMs;
    this.manualBeat = false;

    if (next.gaze) this.startGaze(next.gaze, cfg);
    this.activityId = next.primary;
    this.activityStartedAt = this.clock;
    this.activityUntil = this.beatUntil;

    // A quiet tail lets the destination feel chosen rather than constantly
    // re-targeted. The next story will still begin before the screen feels
    // frozen, and a different story is preferred by BlobMind.
    this.nextBeatAt = this.beatUntil + this.interval(520, 1180, cfg);
    this.nextGazeAt = this.nextBeatAt;
    this.nextExpressionAt = this.nextBeatAt;
    this.nextMouthAt = this.nextBeatAt;
    this.nextBodyAt = this.nextBeatAt;
  }

  private interval(min: number, max: number, cfg: BehaviourConfig) {
    return (min + this.rand() * (max - min)) * cfg.paceScale;
  }

  private blinkGap(cfg: BehaviourConfig) {
    return cfg.blinkIntervalMs * (0.82 + this.rand() * 0.36);
  }

  private mark(id: BehaviourId, duration: number) {
    this.activityId = id;
    this.activityStartedAt = this.clock;
    this.activityUntil = this.clock + duration;
  }

  private pickMood(cfg: BehaviourConfig) {
    let next = this.lastMood;
    while (next === this.lastMood) {
      next = MOOD_ORDER[Math.floor(this.rand() * MOOD_ORDER.length)];
    }
    this.mood = next;
    this.lastMood = next;
    this.nextMoodAt = this.clock + this.interval(6000, 11000, cfg);
    if (this.expressionReleaseAt === 0) {
      this.applyMoodEyeTargets();
      this.applyMoodFace();
    }
    if (this.mouthReleaseAt === 0) this.applyMoodMouthTargets();
  }

  private pickMicro(cfg: BehaviourConfig) {
    const amplitude = 0.32 + this.rand() * 0.48;
    const angle = this.rand() * Math.PI * 2;
    this.microX = Math.cos(angle) * amplitude;
    this.microY = Math.sin(angle) * amplitude * 0.62;
    this.retargetEyes();
    this.nextMicroAt = this.clock + this.interval(350, 900, cfg);
  }

  /**
   * A free glance between scheduled thoughts. Directions rotate through the
   * deterministic sequence, never repeating the last one, so Blob covers left,
   * right, up and down instead of favouring one axis.
   */
  private pickIdleGaze(cfg: BehaviourConfig) {
    let next = IDLE_GAZES[Math.floor(this.rand() * IDLE_GAZES.length)];
    if (next === this.lastIdleGaze) {
      next = IDLE_GAZES[(IDLE_GAZES.indexOf(next) + 2) % IDLE_GAZES.length];
    }
    this.lastIdleGaze = next;
    this.startGaze(next, cfg);
    this.nextGazeAt = this.gazeReleaseAt + this.interval(420, 1400, cfg);
  }

  private startGaze(id: BehaviourId, cfg: BehaviourConfig) {
    const amount = clamp(cfg.gazePx, 0, 11) * (this.plan?.category === "MICRO" ? 0.22 : 1);
    let x = 0;
    let y = 0;
    let bodyDir = 0;
    let duration = 900;
    if (id === "GLANCE_LEFT" || id === "GLANCE_RIGHT") {
      bodyDir = id === "GLANCE_LEFT" ? -1 : 1;
      x = bodyDir * amount * (0.92 + this.rand() * 0.22);
      y = -0.2 + this.rand() * 0.38;
      duration = 820 + this.rand() * 520;
    } else if (id === "LOOK_UP") {
      y = -amount * 0.78;
      x = (this.rand() * 2 - 1) * 0.35;
      duration = 900 + this.rand() * 500;
    } else if (id === "LOOK_DOWN") {
      y = amount * 0.64;
      x = (this.rand() * 2 - 1) * 0.45;
      duration = 780 + this.rand() * 430;
    } else {
      bodyDir = id === "CURIOUS_TILT_LEFT" ? -1 : 1;
      x = bodyDir * amount * 0.72;
      y = -amount * 0.28;
      duration = 1050 + this.rand() * 520;
    }
    this.leftRotation.target =
      id === "CURIOUS_TILT_LEFT" || id === "CURIOUS_TILT_RIGHT"
        ? bodyDir * 1.6
        : 0;
    this.rightRotation.target =
      id === "CURIOUS_TILT_LEFT" || id === "CURIOUS_TILT_RIGHT"
        ? bodyDir * 1.15
        : 0;
    this.baseGazeX = x;
    this.baseGazeY = y;
    this.microX = 0;
    this.microY = 0;
    this.gazeAction = id;
    this.gazeReleaseAt = this.clock + duration;
    this.retargetEyes();
    this.followAt = this.clock + 85 + this.rand() * 35;
    this.followXTarget = this.plan?.category === "MICRO" ? 0 : bodyDir * 3;
    this.followRotationTarget = this.plan?.category === "MICRO" ? 0 : bodyDir * 1.25;
    this.followScaleYTarget = y < -1 ? 0.025 : y > 1 ? -0.022 : -0.012;
    // A gaze shift gets a small confirming blink after the eyes land. The
    // seeded interval still controls ordinary blinks; this only moves the next
    // one earlier when a look has just happened.
    this.nextBlinkAt = Math.min(
      this.nextBlinkAt,
      this.gazeReleaseAt + 70 + this.rand() * 90
    );
    this.mark(id, duration + 650);
  }

  private retargetEyes() {
    const x = this.baseGazeX + this.microX;
    const y = this.baseGazeY + this.microY;
    this.leftX.target = x;
    this.leftY.target = y;
    this.rightX.target = x * 0.965;
    this.rightY.target = y * 0.98;
    this.leftPupilX.target = clamp(x * 0.62, -5.4, 5.4);
    this.leftPupilY.target = clamp(y * 0.5, -4.2, 4.2);
    this.rightPupilX.target = clamp(x * 0.59, -5.2, 5.2);
    this.rightPupilY.target = clamp(y * 0.48, -4, 4);
  }

  /**
   * The stance each expression puts the cloud into. See the `posture` field.
   *
   * lift  negative lifts him (buoyant, alert); positive sinks him (sad, tired)
   * puff  positive inflates the silhouette; negative compresses it (tense)
   * depth positive leans toward the viewer (interest); negative withdraws
   * lean  a small roll, for the off-balance expressions
   */
  private static readonly EXPRESSION_POSTURE: Record<
    ExpressionBehaviour,
    { lift: number; puff: number; depth: number; lean: number }
  > = {
    // Happy: a gentle lift and puff — he inflates slightly with the smile.
    HAPPY_EYES: { lift: -3.4, puff: 0.026, depth: 0.03, lean: 0 },
    // Excited: perkier crown and a real rise toward the viewer.
    EXCITED_EYES: { lift: -6.2, puff: 0.05, depth: 0.06, lean: 0 },
    // Curious: leans in and slightly over, as if approaching the thing.
    CURIOUS_WIDE: { lift: -2.6, puff: 0.018, depth: 0.075, lean: 1.5 },
    // Angry: compressed and tight; the cloud pulls itself in.
    ANGRY_EYES: { lift: 1.6, puff: -0.055, depth: 0.045, lean: 0 },
    ANGRY_BROWS: { lift: 1.2, puff: -0.042, depth: 0.035, lean: 0 },
    // Sad: sags under its own weight and withdraws a little.
    SAD_EYES: { lift: 5.4, puff: -0.036, depth: -0.05, lean: 0 },
    // Sleepy: melts and settles — the heaviest sink of the set.
    SLEEPY_EYES: { lift: 6.6, puff: -0.048, depth: -0.035, lean: 0.9 },
    // Shy: shrinks back and away.
    SHY_EYES: { lift: 2.4, puff: -0.05, depth: -0.08, lean: -1.4 },
    // Love: warm, buoyant, close.
    LOVE_EYES: { lift: -3.8, puff: 0.034, depth: 0.07, lean: 0 },
    // Panic: braced and pulled back.
    PANIC_EYES: { lift: -1.8, puff: -0.03, depth: -0.06, lean: 0 },
    // Confused: off-axis and slightly slack.
    CONFUSED_EYES: { lift: 1.0, puff: 0.012, depth: 0.02, lean: 2.2 },
    // Deadpan: flat, faintly deflated. Reads as "unimpressed", not "asleep".
    DEADPAN_EYES: { lift: 1.8, puff: -0.022, depth: 0.02, lean: 0 },
    // The squints are small facial beats; their stance stays near neutral.
    SOFT_SQUINT: { lift: -0.8, puff: 0.008, depth: 0.012, lean: 0 },
    ONE_EYE_SQUINT_LEFT: { lift: -0.6, puff: 0.008, depth: 0.015, lean: -1.1 },
    ONE_EYE_SQUINT_RIGHT: { lift: -0.6, puff: 0.008, depth: 0.015, lean: 1.1 },
  };

  /**
   * Puts the body into an expression's stance, or back to neutral.
   *
   * Micro-life borrows the same expressions but must stay barely noticeable,
   * so it gets a heavily muted share of the stance: the face still changes, the
   * body only breathes with it.
   */
  private applyPosture(id: ExpressionBehaviour | null) {
    const p = id ? BehaviourController.EXPRESSION_POSTURE[id] : null;
    const scale = this.plan?.category === "MICRO" ? 0.3 : 1;
    this.posture.lift = (p?.lift ?? 0) * scale;
    this.posture.puff = (p?.puff ?? 0) * scale;
    this.posture.depth = (p?.depth ?? 0) * scale;
    this.posture.lean = (p?.lean ?? 0) * scale;
    this.postureLift.target = this.posture.lift;
    this.posturePuff.target = this.posture.puff;
    this.postureDepth.target = this.posture.depth;
    this.postureLean.target = this.posture.lean;
  }

  private startExpression(id: ExpressionBehaviour) {
    const mood = MOODS[this.mood];
    const moodFace = MOOD_FACE[this.mood];
    let duration = 850;
    let style = moodFace.style;
    let pupilScale = moodFace.pupilScale;
    let leftLidBias = 0;
    let rightLidBias = 0;

    // Every expression establishes complete eye targets. Without this reset,
    // a prior one-eye squint or curious tilt leaves stale scale and rotation
    // behind, making later buttons look broken.
    this.leftRotation.target = 0;
    this.rightRotation.target = 0;
    this.leftScaleX.target = mood.eyeScaleX;
    this.rightScaleX.target = mood.eyeScaleX;
    this.leftScaleY.target = mood.eyeScaleY;
    this.rightScaleY.target = mood.eyeScaleY;
    this.leftBrowRotation.target = 0;
    this.rightBrowRotation.target = 0;
    this.leftTension.target = mood.leftTension;
    this.rightTension.target = mood.rightTension;

    if (id === "SOFT_SQUINT") {
      // Squint is a real two-lid closure, not a mild scale change. Both
      // apertures narrow toward a readable centre slit.
      this.leftTension.target = 0.24;
      this.rightTension.target = 0.29;
      this.leftScaleX.target = mood.eyeScaleX + 0.055;
      this.rightScaleX.target = mood.eyeScaleX + 0.045;
      this.leftScaleY.target = mood.eyeScaleY - 0.025;
      this.rightScaleY.target = mood.eyeScaleY - 0.02;
      leftLidBias = -0.08;
      rightLidBias = 0.08;
      duration = 850 + this.rand() * 650;
    } else if (id === "ANGRY_BROWS" || id === "ANGRY_EYES") {
      style = FACE_STYLE.ANGRY;
      pupilScale = 0.68;
      this.leftTension.target = id === "ANGRY_EYES" ? 0.22 : 0.32;
      this.rightTension.target = id === "ANGRY_EYES" ? 0.25 : 0.35;
      this.leftScaleX.target = mood.eyeScaleX + 0.035;
      this.rightScaleX.target = mood.eyeScaleX + 0.03;
      this.leftScaleY.target = mood.eyeScaleY - 0.015;
      this.rightScaleY.target = mood.eyeScaleY - 0.012;
      // Inner brow corners drop toward Blob's nose. The matching lid bias
      // makes the upper lids join the brow instead of leaving round eyes below.
      this.leftBrowRotation.target = 5.4;
      this.rightBrowRotation.target = -5.4;
      leftLidBias = -0.52;
      rightLidBias = 0.52;
      duration = id === "ANGRY_EYES" ? 1080 : 900 + this.rand() * 520;
    } else if (id === "ONE_EYE_SQUINT_LEFT") {
      style = FACE_STYLE.HAPPY;
      this.leftTension.target = 0.58;
      this.rightTension.target = mood.rightTension * 0.98;
      this.leftRotation.target = -2.2;
      this.leftBrowRotation.target = -1.6;
      this.leftScaleY.target = mood.eyeScaleY - 0.015;
      duration = 680 + this.rand() * 500;
    } else if (id === "ONE_EYE_SQUINT_RIGHT") {
      style = FACE_STYLE.HAPPY;
      this.rightTension.target = 0.58;
      this.leftTension.target = mood.leftTension * 0.98;
      this.rightRotation.target = 2.2;
      this.rightBrowRotation.target = 1.6;
      this.rightScaleY.target = mood.eyeScaleY - 0.015;
      duration = 680 + this.rand() * 500;
    } else if (id === "CURIOUS_WIDE") {
      style = FACE_STYLE.SURPRISED;
      pupilScale = 1.12;
      this.leftTension.target = 1.1;
      this.rightTension.target = 1.12;
      this.leftScaleX.target = mood.eyeScaleX + 0.045;
      this.rightScaleX.target = mood.eyeScaleX + 0.045;
      this.leftScaleY.target = mood.eyeScaleY + 0.12;
      this.rightScaleY.target = mood.eyeScaleY + 0.12;
      duration = 760 + this.rand() * 520;
    } else if (id === "HAPPY_EYES") {
      style = FACE_STYLE.HAPPY;
      pupilScale = 1.18;
      this.leftTension.target = 1.06;
      this.rightTension.target = 1.08;
      this.leftScaleX.target = mood.eyeScaleX + 0.035;
      this.rightScaleX.target = mood.eyeScaleX + 0.03;
      this.leftScaleY.target = mood.eyeScaleY + 0.055;
      this.rightScaleY.target = mood.eyeScaleY + 0.05;
      this.leftBrowRotation.target = -2.2;
      this.rightBrowRotation.target = 2.2;
      duration = 980;
    } else if (id === "EXCITED_EYES") {
      style = FACE_STYLE.EXCITED;
      pupilScale = 1.32;
      this.leftTension.target = 1.18;
      this.rightTension.target = 1.2;
      this.leftScaleX.target = mood.eyeScaleX + 0.07;
      this.rightScaleX.target = mood.eyeScaleX + 0.065;
      this.leftScaleY.target = mood.eyeScaleY + 0.14;
      this.rightScaleY.target = mood.eyeScaleY + 0.135;
      this.leftBrowRotation.target = -1.6;
      this.rightBrowRotation.target = 1.6;
      duration = 920;
    } else if (id === "SHY_EYES") {
      style = FACE_STYLE.SHY;
      pupilScale = 0.9;
      this.leftTension.target = 0.72;
      this.rightTension.target = 0.76;
      this.leftScaleX.target = mood.eyeScaleX + 0.02;
      this.rightScaleX.target = mood.eyeScaleX + 0.015;
      this.leftScaleY.target = mood.eyeScaleY - 0.02;
      this.rightScaleY.target = mood.eyeScaleY - 0.016;
      leftLidBias = 0.22;
      rightLidBias = -0.18;
      duration = 1200;
    } else if (id === "SLEEPY_EYES") {
      style = FACE_STYLE.SLEEPY;
      pupilScale = 0.74;
      this.leftTension.target = 0.23;
      this.rightTension.target = 0.27;
      this.leftScaleX.target = mood.eyeScaleX + 0.04;
      this.rightScaleX.target = mood.eyeScaleX + 0.035;
      this.leftScaleY.target = mood.eyeScaleY - 0.055;
      this.rightScaleY.target = mood.eyeScaleY - 0.05;
      leftLidBias = 0.18;
      rightLidBias = 0.14;
      duration = 1350;
    } else if (id === "SAD_EYES") {
      style = FACE_STYLE.SAD;
      pupilScale = 0.76;
      this.leftTension.target = 0.66;
      this.rightTension.target = 0.7;
      this.leftScaleX.target = mood.eyeScaleX + 0.015;
      this.rightScaleX.target = mood.eyeScaleX + 0.012;
      this.leftScaleY.target = mood.eyeScaleY - 0.03;
      this.rightScaleY.target = mood.eyeScaleY - 0.028;
      this.leftBrowRotation.target = -3.4;
      this.rightBrowRotation.target = 3.4;
      leftLidBias = 0.12;
      rightLidBias = -0.12;
      duration = 1280;
    } else if (id === "CONFUSED_EYES") {
      style = FACE_STYLE.CONFUSED;
      pupilScale = 0.9;
      this.leftTension.target = 0.88;
      this.rightTension.target = 0.76;
      this.leftRotation.target = -3.2;
      this.rightRotation.target = 2.2;
      this.leftBrowRotation.target = -2.2;
      this.rightBrowRotation.target = 2.6;
      leftLidBias = -0.16;
      rightLidBias = 0.2;
      duration = 1180;
    } else if (id === "LOVE_EYES") {
      style = FACE_STYLE.LOVE;
      pupilScale = 1.05;
      this.leftTension.target = 1.02;
      this.rightTension.target = 1.04;
      this.leftScaleY.target = mood.eyeScaleY + 0.08;
      this.rightScaleY.target = mood.eyeScaleY + 0.075;
      duration = 1300;
    } else if (id === "PANIC_EYES") {
      style = FACE_STYLE.PANIC;
      pupilScale = 0.62;
      this.leftTension.target = 1.16;
      this.rightTension.target = 1.18;
      this.leftScaleX.target = mood.eyeScaleX + 0.06;
      this.rightScaleX.target = mood.eyeScaleX + 0.055;
      this.leftScaleY.target = mood.eyeScaleY + 0.16;
      this.rightScaleY.target = mood.eyeScaleY + 0.15;
      duration = 860;
    } else if (id === "DEADPAN_EYES") {
      style = FACE_STYLE.DEADPAN;
      pupilScale = 0.82;
      this.leftTension.target = 0.58;
      this.rightTension.target = 0.62;
      this.leftScaleY.target = mood.eyeScaleY - 0.025;
      this.rightScaleY.target = mood.eyeScaleY - 0.022;
      duration = 1500;
    }

    this.faceStyle = style;
    this.pupilScale.target = pupilScale;
    this.leftLidBias.target = leftLidBias;
    this.rightLidBias.target = rightLidBias;
    this.leftEyeStyle = style;
    this.rightEyeStyle = style;
    this.lidAction = id;
    this.applyPosture(id);
    this.expressionReleaseAt = this.clock + duration;
    this.mark(id, duration + 300);
  }

  private startMouth(id: BehaviourId) {
    let duration = 720;
    if (id === "MOUTH_RELAX") {
      this.mouthX.target = 0;
      this.mouthY.target = 0.7;
      this.mouthScaleX.target = 0.09;
      this.mouthScaleY.target = -0.1;
      this.mouthCurve.target = 0.5;
      this.mouthO.target = 0;
      this.mouthCrescent.target =
        this.faceStyle === FACE_STYLE.HAPPY || this.faceStyle === FACE_STYLE.CONTENT
          ? 0.72
          : 0;
      this.mouthD.target =
        this.faceStyle === FACE_STYLE.EXCITED
          ? 0.82
          : this.faceStyle === FACE_STYLE.ANGRY
            ? 0.68
            : this.faceStyle === FACE_STYLE.SAD
              ? 0.12
              : 0;
      this.setMouthRotationTarget(0);
      duration = 900 + this.rand() * 500;
    } else if (id === "MOUTH_TWITCH") {
      const dir = this.rand() < 0.5 ? -1 : 1;
      this.mouthX.target = dir * 0.9;
      this.mouthY.target = -0.08;
      this.mouthScaleX.target = 0.04;
      this.mouthScaleY.target = -0.02;
      this.mouthCurve.target = 0.62 + dir * 0.18;
      this.mouthO.target = 0;
      this.mouthCrescent.target = 0.35;
      this.mouthD.target =
        this.faceStyle === FACE_STYLE.ANGRY
          ? 0.62
          : 0;
      this.setMouthRotationTarget(dir * 4.5);
      duration = 380 + this.rand() * 260;
    } else if (id === "MOUTH_O") {
      this.mouthX.target = 0;
      this.mouthY.target = -0.28;
      this.mouthScaleX.target = -0.16;
      this.mouthScaleY.target = 0.08;
      this.mouthCurve.target = 0;
      this.mouthO.target = 1;
      this.mouthD.target = 0;
      this.mouthCrescent.target = 0;
      this.setMouthRotationTarget(0);
      duration = 820 + this.rand() * 520;
    } else {
      this.mouthX.target = 0;
      this.mouthY.target = 0.3;
      this.mouthScaleX.target = -0.12;
      this.mouthScaleY.target = 0.06;
      this.mouthCurve.target = -1;
      this.mouthO.target = 0;
      this.mouthCrescent.target = 0;
      this.mouthD.target =
        this.faceStyle === FACE_STYLE.ANGRY
          ? 0.76
          : this.faceStyle === FACE_STYLE.HAPPY || this.faceStyle === FACE_STYLE.EXCITED
            ? 0.56
            : 0.1;
      this.setMouthRotationTarget(0);
      duration = 1100 + this.rand() * 650;
    }
    this.mouthAction = id;
    this.mouthReleaseAt = this.clock + duration;
    this.mark(id, duration + 300);
  }

  /**
   * SENSED variants are short coordinated thoughts, not separate animation
   * systems. Eyes lead, mouth follows, and the jelly body answers last while
   * the normal SENSED idle playlist remains available between beats.
   */
  private startSensedVariant(
    id: "SENSED_WORRIED" | "SENSED_SURPRISED",
    cfg: BehaviourConfig
  ) {
    this.clearBeatCues();
    const worried = id === "SENSED_WORRIED";
    this.startGaze(worried ? "LOOK_DOWN" : "LOOK_UP", cfg);
    this.beatExpressionAt = this.clock + 58;
    this.beatExpressionId = worried ? "SOFT_SQUINT" : "CURIOUS_WIDE";
    this.beatMouthAt = this.clock + 94;
    this.beatMouthId = worried ? "MOUTH_FLIP" : "MOUTH_O";
    this.beatBodyAt = this.clock + 122;
    this.beatBodyId = worried ? "BODY_SETTLE" : "TALL_STRETCH";
    this.beatUntil = this.clock + (worried ? 1900 : 1650);
    this.manualBeat = true;
    this.nextBeatAt = Math.max(this.nextBeatAt, this.beatUntil + 260);
    this.activityId = id;
    this.activityStartedAt = this.clock;
    this.activityUntil = this.beatUntil;
    // Let the authored beat land cleanly before an automatic blink competes
    // with it. Manual blink tests still work immediately.
    this.nextBlinkAt = Math.max(this.nextBlinkAt, this.beatUntil + 180);
  }

  /** Reusable emotion and idle beats for the expression library. */
  private startLibraryBeat(
    id:
      | "ANGRY_STARE"
      | "ANGRY_SQUINT"
      | "ANGRY_TILT"
      | "SAD_DOWNCAST"
      | "SAD_WOBBLE"
      | "SAD_SMALL"
      | "IDLE_SOFT_BREATH"
      | "IDLE_LOOK_AROUND"
      | "IDLE_SETTLE"
      | "HAPPY_BOUNCE"
      | "SHOCKED_RECOIL"
      | "CONFUSED_TILT"
      | "SLEEPY_MELT"
      | "LAUGH_SQUISH"
      | "PLAYFUL_WINK"
      | "PANIC_SHAKE"
      | "PROUD_STRETCH"
      | "CASUAL_SQUINT"
      | "LAZY_LOOK"
      | "SOFT_SIGH"
      | "JOY_HOP"
      | "EXCITED_WIGGLE"
      | "CURIOUS_DOUBLE_TAKE"
      | "SHY_PEEK"
      | "EMBARRASSED_BLUSH"
      | "SLEEPY_YAWN"
      | "DEADPAN_SIDE_EYE"
      | "ANGRY_FLARE"
      | "DIZZY_WOBBLE"
      | "LOVE_SPARKLE"
      | "SURPRISE_POP"
      | "TEARY_POUT",
    cfg: BehaviourConfig
  ) {
    this.clearBeatCues();
    let gaze: GazeBehaviour | null = null;
    let expression: ExpressionBehaviour | null = null;
    let mouth: MouthBehaviour | null = null;
    let body: BodyBehaviour | null = null;
    let duration = 1500;

    switch (id) {
      case "ANGRY_STARE":
        expression = "ANGRY_EYES";
        mouth = "MOUTH_FLIP";
        body = "JELLY_TWIST_RIGHT";
        duration = 1650;
        break;
      case "ANGRY_SQUINT":
        expression = "ANGRY_EYES";
        mouth = "MOUTH_FLIP";
        body = "SIDE_SQUISH_RIGHT";
        duration = 1450;
        break;
      case "ANGRY_TILT":
        gaze = "CURIOUS_TILT_RIGHT";
        expression = "ANGRY_EYES";
        mouth = "MOUTH_FLIP";
        body = "JELLY_TWIST_RIGHT";
        duration = 1750;
        break;
      case "SAD_DOWNCAST":
        gaze = "LOOK_DOWN";
        expression = "SAD_EYES";
        mouth = "MOUTH_FLIP";
        body = "BODY_SETTLE";
        duration = 1900;
        break;
      case "SAD_WOBBLE":
        gaze = "LOOK_DOWN";
        expression = "SAD_EYES";
        mouth = "MOUTH_FLIP";
        body = "SOFT_SWAY_LEFT";
        duration = 1850;
        break;
      case "SAD_SMALL":
        gaze = "LOOK_DOWN";
        expression = "SAD_EYES";
        mouth = "MOUTH_RELAX";
        body = "BREATH_STRETCH";
        duration = 1700;
        break;
      case "IDLE_SOFT_BREATH":
        expression = "SOFT_SQUINT";
        mouth = "MOUTH_RELAX";
        body = "BREATH_STRETCH";
        duration = 1550;
        break;
      case "IDLE_LOOK_AROUND":
        gaze = "GLANCE_LEFT";
        duration = 1250;
        break;
      case "IDLE_SETTLE":
        expression = "SOFT_SQUINT";
        mouth = "MOUTH_RELAX";
        body = "BODY_SETTLE";
        duration = 1600;
        break;
      case "HAPPY_BOUNCE":
        expression = "HAPPY_EYES";
        mouth = "MOUTH_RELAX";
        body = "JOY_HOP";
        duration = 1550;
        break;
      case "SHOCKED_RECOIL":
        gaze = "LOOK_UP";
        expression = "CURIOUS_WIDE";
        mouth = "MOUTH_O";
        body = "BODY_SETTLE";
        duration = 1750;
        break;
      case "CONFUSED_TILT":
        gaze = "CURIOUS_TILT_LEFT";
        expression = "CONFUSED_EYES";
        mouth = "MOUTH_TWITCH";
        body = "JELLY_TWIST_LEFT";
        duration = 1700;
        break;
      case "SLEEPY_MELT":
        gaze = "LOOK_DOWN";
        expression = "SLEEPY_EYES";
        mouth = "MOUTH_RELAX";
        body = "SLEEPY_MELT";
        duration = 2100;
        break;
      case "LAUGH_SQUISH":
        expression = "HAPPY_EYES";
        mouth = "MOUTH_TWITCH";
        body = "SIDE_SQUISH_LEFT";
        duration = 1450;
        break;
      case "PLAYFUL_WINK":
        gaze = "GLANCE_RIGHT";
        expression = "ONE_EYE_SQUINT_LEFT";
        mouth = "MOUTH_TWITCH";
        body = "SOFT_SWAY_RIGHT";
        duration = 1500;
        break;
      case "PANIC_SHAKE":
        expression = "PANIC_EYES";
        mouth = "MOUTH_O";
        body = "EXCITED_WIGGLE";
        duration = 1300;
        break;
      case "PROUD_STRETCH":
        expression = "HAPPY_EYES";
        mouth = "MOUTH_RELAX";
        body = "TALL_STRETCH";
        duration = 1800;
        break;
      case "CASUAL_SQUINT":
        expression = "SOFT_SQUINT";
        mouth = "MOUTH_RELAX";
        body = "BODY_SETTLE";
        duration = 1650;
        break;
      case "LAZY_LOOK":
        gaze = "LOOK_DOWN";
        expression = "ONE_EYE_SQUINT_RIGHT";
        mouth = "MOUTH_TWITCH";
        body = "SOFT_SWAY_LEFT";
        duration = 1800;
        break;
      case "SOFT_SIGH":
        gaze = "LOOK_DOWN";
        expression = "SOFT_SQUINT";
        mouth = "MOUTH_RELAX";
        body = "BREATH_STRETCH";
        duration = 2100;
        break;
      case "JOY_HOP":
        expression = "HAPPY_EYES";
        mouth = "MOUTH_RELAX";
        body = "JOY_HOP";
        duration = 1700;
        break;
      case "EXCITED_WIGGLE":
        expression = "EXCITED_EYES";
        mouth = "MOUTH_O";
        body = "EXCITED_WIGGLE";
        duration = 1550;
        break;
      case "CURIOUS_DOUBLE_TAKE":
        expression = "CURIOUS_WIDE";
        mouth = "MOUTH_O";
        body = "CURIOUS_DOUBLE_TAKE";
        duration = 2050;
        break;
      case "SHY_PEEK":
        expression = "SHY_EYES";
        mouth = "MOUTH_TWITCH";
        body = "SHY_PEEK";
        duration = 1850;
        break;
      case "EMBARRASSED_BLUSH":
        expression = "SHY_EYES";
        mouth = "MOUTH_FLIP";
        body = "SHY_PEEK";
        duration = 1700;
        break;
      case "SLEEPY_YAWN":
        gaze = "LOOK_DOWN";
        expression = "SLEEPY_EYES";
        mouth = "MOUTH_O";
        body = "SLEEPY_YAWN";
        duration = 2450;
        break;
      case "DEADPAN_SIDE_EYE":
        gaze = "GLANCE_RIGHT";
        expression = "DEADPAN_EYES";
        mouth = "MOUTH_TWITCH";
        body = "SOFT_SWAY_RIGHT";
        duration = 1750;
        break;
      case "ANGRY_FLARE":
        expression = "ANGRY_EYES";
        mouth = "MOUTH_FLIP";
        body = "ANGRY_FLARE";
        duration = 1550;
        break;
      case "DIZZY_WOBBLE":
        expression = "CONFUSED_EYES";
        mouth = "MOUTH_O";
        body = "DIZZY_WOBBLE";
        duration = 1900;
        break;
      case "LOVE_SPARKLE":
        expression = "LOVE_EYES";
        mouth = "MOUTH_RELAX";
        body = "SOFT_SWAY_RIGHT";
        duration = 2150;
        break;
      case "SURPRISE_POP":
        gaze = "LOOK_UP";
        expression = "EXCITED_EYES";
        mouth = "MOUTH_O";
        body = "SURPRISE_POP";
        duration = 1850;
        break;
      case "TEARY_POUT":
        gaze = "LOOK_DOWN";
        expression = "SAD_EYES";
        mouth = "MOUTH_FLIP";
        body = "TEARY_POUT";
        duration = 2050;
        break;
    }

    if (gaze) this.startGaze(gaze, cfg);
    this.beatExpressionAt = expression ? this.clock + 56 : 0;
    this.beatMouthAt = mouth ? this.clock + 92 : 0;
    this.beatBodyAt = body ? this.clock + 118 : 0;
    this.beatExpressionId = expression;
    this.beatMouthId = mouth;
    this.beatBodyId = body;
    this.beatUntil = this.clock + duration;
    this.manualBeat = true;
    this.nextBeatAt = Math.max(this.nextBeatAt, this.beatUntil + 260);
    this.activityId = id;
    this.activityStartedAt = this.clock;
    this.activityUntil = this.beatUntil;
  }

  private startBody(id: BehaviourId, cfg: BehaviourConfig) {
    if (id === "SPIN_360") {
      this.startSpin();
      return;
    }
    if (id === "WALL_IMPACT_LEFT" || id === "WALL_IMPACT_RIGHT") {
      this.startWallImpact(id, cfg);
      return;
    }
    const strength = clamp(cfg.squash / 0.032, 0.55, 1.35);
    let sy = 0;
    let duration = 620;
    let dir = 0;
    const dynamic =
      id === "JOY_HOP" ||
      id === "EXCITED_WIGGLE" ||
      id === "CURIOUS_DOUBLE_TAKE" ||
      id === "SHY_PEEK" ||
      id === "SLEEPY_MELT" ||
      id === "SLEEPY_YAWN" ||
      id === "ANGRY_FLARE" ||
      id === "DIZZY_WOBBLE" ||
      id === "SURPRISE_POP" ||
      id === "TEARY_POUT";
    this.clearBodyTargets();
    if (dynamic) {
      duration =
        id === "JOY_HOP"
          ? 1320
          : id === "EXCITED_WIGGLE"
            ? 1220
            : id === "CURIOUS_DOUBLE_TAKE"
              ? 1480
              : id === "SHY_PEEK"
                ? 1320
                : id === "SLEEPY_MELT"
                  ? 1780
                  : id === "SLEEPY_YAWN"
                    ? 1980
                    : id === "ANGRY_FLARE"
                      ? 1180
                      : id === "DIZZY_WOBBLE"
                        ? 1540
                        : id === "SURPRISE_POP"
                          ? 1260
                          : 1420;
    } else if (id === "BODY_SETTLE") {
      sy = -0.064 * strength;
      this.localBodyY = 6.2;
      this.massYTarget = 3.1;
      this.massScaleYTarget = -0.025 * strength;
      this.massOriginYTarget = 0.96;
      duration = 520;
    } else if (id === "TINY_SQUISH") {
      sy = -0.052 * strength;
      this.localBodyY = 3.5;
      this.massYTarget = 1.6;
      this.massScaleYTarget = -0.02 * strength;
      this.massOriginYTarget = 0.94;
      duration = 420;
    } else if (id === "SOFT_SWAY_LEFT" || id === "SOFT_SWAY_RIGHT") {
      dir = id === "SOFT_SWAY_LEFT" ? -1 : 1;
      sy = -0.025 * strength;
      this.localBodyX = dir * 5.8;
      this.localBodyRotation = dir * 1.75;
      this.massXTarget = dir * 3.9;
      this.massRotationTarget = dir * 1.45;
      this.massSkewYTarget = dir * 1.8;
      this.massOriginXTarget = -dir * 0.9;
      duration = 760;
    } else if (id === "SIDE_SQUISH_LEFT" || id === "SIDE_SQUISH_RIGHT") {
      dir = id === "SIDE_SQUISH_LEFT" ? -1 : 1;
      const sx = -0.066 * strength;
      sy = 1 / (1 + sx) - 1;
      this.localBodyX = dir * 6.6;
      this.localBodyRotation = dir * 1.05;
      this.massXTarget = dir * 4.8;
      this.massRotationTarget = dir * 1.7;
      this.massSkewYTarget = dir * 2.6;
      this.massOriginXTarget = -dir;
      this.localBodyScaleY = sy;
      this.massScaleYTarget = sy * 0.34;
      duration = 570;
    } else if (id === "TALL_STRETCH" || id === "BREATH_STRETCH") {
      sy = (id === "TALL_STRETCH" ? 0.082 : 0.058) * strength;
      this.localBodyY = id === "TALL_STRETCH" ? -5 : -2.9;
      this.massYTarget = -2.1;
      this.massScaleYTarget = sy * 0.38;
      this.massOriginYTarget = 0.98;
      duration = id === "TALL_STRETCH" ? 690 : 920;
    } else {
      dir = id === "JELLY_TWIST_LEFT" ? -1 : 1;
      sy = 0.034 * strength;
      this.localBodyX = dir * 4.7;
      this.localBodyRotation = dir * 1.55;
      this.massXTarget = dir * 3.5;
      this.massRotationTarget = dir * 3.2;
      this.massSkewXTarget = -dir * 1.8;
      this.massSkewYTarget = dir * 2.8;
      this.massOriginXTarget = -dir * 0.95;
      duration = 670;
    }
    if (!dynamic && id !== "SIDE_SQUISH_LEFT" && id !== "SIDE_SQUISH_RIGHT") {
      this.localBodyScaleY = sy;
    }
    this.bodyAction = id;
    this.bodyStartedAt = this.clock;
    this.bodyReleaseAt = this.clock + duration;
    this.mark(id, duration + 750);
  }

  /** Short authored body phrases. Each uses the same scalar springs as drag. */
  private updateBodyBeat() {
    const id = this.bodyAction;
    if (this.bodyReleaseAt <= this.clock || this.bodyStartedAt <= 0) return;
    if (
      id !== "JOY_HOP" &&
      id !== "EXCITED_WIGGLE" &&
      id !== "CURIOUS_DOUBLE_TAKE" &&
      id !== "SHY_PEEK" &&
      id !== "SLEEPY_MELT" &&
      id !== "SLEEPY_YAWN" &&
      id !== "ANGRY_FLARE" &&
      id !== "DIZZY_WOBBLE" &&
      id !== "SURPRISE_POP" &&
      id !== "TEARY_POUT"
    ) {
      return;
    }

    const duration =
      id === "JOY_HOP"
        ? 1320
        : id === "EXCITED_WIGGLE"
          ? 1220
          : id === "CURIOUS_DOUBLE_TAKE"
            ? 1480
            : id === "SHY_PEEK"
              ? 1320
              : id === "SLEEPY_MELT"
                ? 1780
                : id === "SLEEPY_YAWN"
                  ? 1980
                  : id === "ANGRY_FLARE"
                    ? 1180
                    : id === "DIZZY_WOBBLE"
                      ? 1540
                      : id === "SURPRISE_POP"
                        ? 1260
                        : 1420;
    const t = clamp01((this.clock - this.bodyStartedAt) / duration);
    const eased = smoothstep(t);
    let offsetX = 0;
    let offsetY = 0;
    let offsetRotation = 0;
    let offsetScaleY = 0;
    let massX = 0;
    let massY = 0;
    let massRotation = 0;
    let massScaleY = 0;
    let skewX = 0;
    let skewY = 0;

    if (id === "JOY_HOP") {
      if (t < 0.16) {
        const p = smoothstep(t / 0.16);
        offsetY = 6 * p;
        offsetScaleY = -0.08 * p;
      } else if (t < 0.43) {
        const p = smoothstep((t - 0.16) / 0.27);
        offsetY = mix(6, -17, p);
        offsetScaleY = mix(-0.08, 0.065, p);
      } else if (t < 0.62) {
        const p = smoothstep((t - 0.43) / 0.19);
        offsetY = mix(-17, -13, p);
        offsetScaleY = mix(0.065, 0.035, p);
      } else if (t < 0.78) {
        const p = smoothstep((t - 0.62) / 0.16);
        offsetY = mix(-13, 7, p);
        offsetScaleY = mix(0.035, -0.115, p);
      } else {
        const p = smoothstep((t - 0.78) / 0.22);
        offsetY = mix(7, 0, p);
        offsetScaleY = mix(-0.115, 0, p);
      }
      massY = offsetY * 0.36;
      massScaleY = offsetScaleY * 0.35;
    } else if (id === "EXCITED_WIGGLE") {
      const envelope = Math.sin(Math.PI * eased);
      const wave = Math.sin(eased * Math.PI * 3.6);
      offsetX = wave * 8.5 * envelope;
      offsetY = -Math.abs(wave) * 3.5 * envelope;
      offsetRotation = wave * 4.4 * envelope;
      offsetScaleY = (Math.abs(wave) * 0.04 - 0.022) * envelope;
      massX = offsetX * 0.7;
      massY = offsetY * 0.7;
      massRotation = offsetRotation * 0.82;
      massScaleY = offsetScaleY * 0.4;
      skewX = -wave * 3.2 * envelope;
    } else if (id === "CURIOUS_DOUBLE_TAKE") {
      if (t < 0.18) {
        const p = smoothstep(t / 0.18);
        offsetX = 3.8 * p;
      } else if (t < 0.38) {
        const p = smoothstep((t - 0.18) / 0.2);
        offsetX = mix(3.8, -5.4, p);
      } else if (t < 0.58) {
        const p = smoothstep((t - 0.38) / 0.2);
        offsetX = mix(-5.4, 4.2, p);
      } else {
        offsetX = mix(4.2, 0, smoothstep((t - 0.58) / 0.42));
      }
      offsetRotation = offsetX * 0.33;
      massX = offsetX * 0.72;
      massRotation = offsetRotation * 0.9;
      skewY = offsetX * 0.42;
      const gazeX =
        t < 0.18
          ? 0
          : t < 0.38
            ? 6.2
            : t < 0.58
              ? -6.4
              : mix(-6.4, 0, smoothstep((t - 0.58) / 0.42));
      const gazeY = t < 0.38 ? -0.8 : t < 0.58 ? -0.1 : 0;
      this.baseGazeX = gazeX;
      this.baseGazeY = gazeY;
      this.retargetEyes();
    } else if (id === "SHY_PEEK") {
      const retreat = Math.sin(Math.PI * eased);
      offsetX = -5.6 * retreat;
      offsetY = 2.7 * retreat;
      offsetRotation = -2.3 * retreat;
      offsetScaleY = -0.038 * retreat;
      massX = offsetX * 0.74;
      massY = offsetY * 0.74;
      massRotation = offsetRotation * 0.8;
      massScaleY = offsetScaleY * 0.4;
    } else if (id === "SLEEPY_MELT") {
      const settle = t < 0.58 ? smoothstep(t / 0.58) : smoothstep((1 - t) / 0.42);
      offsetY = t < 0.58 ? 8 * settle : 8 * settle;
      offsetScaleY = -0.085 * settle;
      offsetRotation = 1.3 * settle;
      massY = offsetY * 0.48;
      massScaleY = offsetScaleY * 0.4;
      massRotation = offsetRotation * 0.7;
    } else if (id === "SLEEPY_YAWN") {
      if (t < 0.2) {
        const p = smoothstep(t / 0.2);
        offsetY = 4 * p;
        offsetScaleY = -0.05 * p;
      } else if (t < 0.48) {
        const p = smoothstep((t - 0.2) / 0.28);
        offsetY = mix(4, -8, p);
        offsetScaleY = mix(-0.05, 0.06, p);
      } else if (t < 0.7) {
        const p = smoothstep((t - 0.48) / 0.22);
        offsetY = mix(-8, 4, p);
        offsetScaleY = mix(0.06, -0.075, p);
      } else {
        const p = smoothstep((t - 0.7) / 0.3);
        offsetY = mix(4, 0, p);
        offsetScaleY = mix(-0.075, 0, p);
      }
      massY = offsetY * 0.4;
      massScaleY = offsetScaleY * 0.34;
    } else if (id === "ANGRY_FLARE") {
      const pulse = Math.sin(Math.PI * eased);
      const shake = Math.sin(eased * Math.PI * 7.2) * pulse;
      offsetX = shake * 3.2;
      offsetY = 2.6 * pulse;
      offsetRotation = shake * 2.8;
      offsetScaleY = -0.075 * pulse;
      massX = offsetX * 0.8;
      massY = offsetY * 0.72;
      massRotation = offsetRotation * 0.82;
      massScaleY = offsetScaleY * 0.38;
      skewY = shake * 2.4;
    } else if (id === "DIZZY_WOBBLE") {
      const envelope = Math.sin(Math.PI * eased);
      const wave = Math.sin(eased * Math.PI * 2.5);
      offsetX = wave * 7.2 * envelope;
      offsetY = Math.abs(wave) * 2.2 * envelope;
      offsetRotation = wave * 6.5 * envelope;
      offsetScaleY = -0.035 * envelope;
      massX = offsetX * 0.7;
      massY = offsetY * 0.78;
      massRotation = offsetRotation * 0.9;
      massScaleY = offsetScaleY * 0.4;
      skewX = -wave * 3.8 * envelope;
    } else if (id === "SURPRISE_POP") {
      if (t < 0.17) {
        const p = smoothstep(t / 0.17);
        offsetY = 5 * p;
        offsetScaleY = -0.07 * p;
      } else if (t < 0.42) {
        const p = smoothstep((t - 0.17) / 0.25);
        offsetY = mix(5, -19, p);
        offsetScaleY = mix(-0.07, 0.09, p);
      } else if (t < 0.62) {
        const p = smoothstep((t - 0.42) / 0.2);
        offsetY = mix(-19, -13, p);
        offsetScaleY = mix(0.09, 0.03, p);
      } else {
        const p = smoothstep((t - 0.62) / 0.38);
        offsetY = mix(-13, 0, p);
        offsetScaleY = mix(0.03, 0, p);
      }
      massY = offsetY * 0.34;
      massScaleY = offsetScaleY * 0.3;
    } else if (id === "TEARY_POUT") {
      const settle = Math.sin(Math.PI * eased);
      offsetY = 3.8 * settle;
      offsetScaleY = -0.048 * settle;
      offsetRotation = -1.2 * settle;
      massY = offsetY * 0.52;
      massScaleY = offsetScaleY * 0.4;
      massRotation = offsetRotation * 0.72;
    }

    this.localBodyX = offsetX;
    this.localBodyY = offsetY;
    this.localBodyRotation = offsetRotation;
    this.localBodyScaleY = offsetScaleY;
    this.massXTarget = massX;
    this.massYTarget = massY;
    this.massRotationTarget = massRotation;
    this.massScaleYTarget = massScaleY;
    this.massSkewXTarget = skewX;
    this.massSkewYTarget = skewY;
  }

  /**
   * Storybook-style entrances and exits. Targets change in phases so the same
   * spring system can sell weight, peek, and recovery without sprite sequences.
   */
  private startSpecial(id: SpecialBehaviour, cfg: BehaviourConfig) {
    this.clearBeatCues();
    this.clearBodyTargets();
    this.spinStartedAt = -1;
    this.spinRotation = 0;
    this.impactAt = 0;
    this.specialAction = id;
    this.specialDirection = id === "VANISH_REAPPEAR" && this.rand() < 0.5 ? -1 : 1;
    this.specialStartedAt = this.clock;
    this.specialEmoteStarted = false;
    this.specialScale = 0;
    this.specialOpacity = 1;
    this.travelXTarget = 0;
    this.travelYTarget = 0;
    this.travelRotationTarget = 0;
    this.travelDepthTarget = 0;
    this.travelYawTarget = 0;
    this.travelPitchTarget = 0;
    this.travelScaleYTarget = 0;
    this.manualBeat = true;

    const duration = id === "VANISH_REAPPEAR" ? 1900 : id === "POP_OUT_IN" ? 2050 : 2250;
    this.bodyAction = id;
    this.bodyReleaseAt = this.clock + duration;
    this.activityId = id;
    this.activityStartedAt = this.clock;
    this.activityUntil = this.clock + duration;
    this.nextBeatAt = Math.max(this.nextBeatAt, this.clock + duration + 600 * cfg.paceScale);
  }

  private updateSpecial() {
    const id = this.specialAction;
    if (!id || this.specialStartedAt < 0) return;
    const duration = id === "VANISH_REAPPEAR" ? 1900 : id === "POP_OUT_IN" ? 2050 : 2250;
    const t = clamp01((this.clock - this.specialStartedAt) / duration);
    const direction =
      id === "CREEP_IN_LEFT"
        ? -1
        : id === "CREEP_IN_RIGHT"
          ? 1
          : this.specialDirection;

    this.specialScale = 0;
    this.specialOpacity = 1;
    if (id === "CREEP_IN_LEFT" || id === "CREEP_IN_RIGHT") {
      if (t < 0.2) {
        const p = smoothstep(t / 0.2);
        this.travelXTarget = mix(0, direction * 370, p);
        this.travelYawTarget = mix(0, direction * 28, p);
      } else if (t < 0.5) {
        const p = smoothstep((t - 0.2) / 0.3);
        this.travelXTarget = mix(direction * 370, direction * 235, p);
        this.travelYawTarget = mix(direction * 28, direction * 16, p);
        this.travelScaleYTarget = 0.05 * (1 - p);
      } else if (t < 0.76) {
        const p = smoothstep((t - 0.5) / 0.26);
        this.travelXTarget = mix(direction * 235, direction * 150, p);
        this.travelYawTarget = mix(direction * 16, direction * 9, p);
        this.travelScaleYTarget = 0.028 * (1 - p);
      } else {
        const p = smoothstep((t - 0.76) / 0.24);
        this.travelXTarget = mix(direction * 150, 0, p);
        this.travelYawTarget = mix(direction * 9, 0, p);
      }
    } else if (id === "POP_OUT_IN") {
      if (t < 0.22) {
        const p = smoothstep(t / 0.22);
        this.travelYTarget = mix(0, -370, p);
        this.travelPitchTarget = mix(0, -14, p);
      } else if (t < 0.5) {
        const p = smoothstep((t - 0.22) / 0.28);
        this.travelYTarget = mix(-370, -235, p);
        this.travelPitchTarget = mix(-14, -6, p);
        this.travelScaleYTarget = 0.06 * (1 - p);
      } else {
        const p = smoothstep((t - 0.5) / 0.5);
        this.travelYTarget = mix(-235, 0, p);
        this.travelPitchTarget = mix(-6, 0, p);
        this.travelScaleYTarget = 0.03 * (1 - p);
      }
    } else {
      const out = smoothstep(clamp01(t / 0.25));
      const back = smoothstep(clamp01((t - 0.42) / 0.3));
      if (id === "VANISH_REAPPEAR") {
        // Leave through a bounded edge pocket, hold invisibly for one beat,
        // then return from that same side. The old version only changed scale
        // and could leave an off-screen target behind after interruption.
        if (t < 0.16) {
          const p = smoothstep(t / 0.16);
          this.travelXTarget = mix(0, direction * 38, p);
          this.travelYTarget = mix(0, -5, p);
          this.travelRotationTarget = mix(0, direction * 2.5, p);
          this.specialScale = mix(0, -0.1, p);
          this.specialOpacity = 1;
        } else if (t < 0.43) {
          const p = smoothstep((t - 0.16) / 0.27);
          this.travelXTarget = mix(direction * 38, direction * VANISH_EDGE, p);
          this.travelYTarget = mix(-5, -15, p);
          this.travelRotationTarget = mix(direction * 2.5, direction * 8, p);
          this.specialScale = mix(-0.1, -0.94, p);
          this.specialOpacity = mix(1, 0, p);
        } else if (t < 0.59) {
          this.travelXTarget = direction * VANISH_EDGE;
          this.travelYTarget = -15;
          this.travelRotationTarget = direction * 8;
          this.specialScale = -0.94;
          this.specialOpacity = 0;
        } else if (t < 0.87) {
          const p = smoothstep((t - 0.59) / 0.28);
          this.travelXTarget = mix(direction * VANISH_EDGE, 0, p);
          this.travelYTarget = mix(-15, 0, p);
          this.travelRotationTarget = mix(direction * 8, 0, p);
          this.specialScale = mix(-0.94, -0.02, p);
          this.specialOpacity = mix(0, 1, p);
        } else {
          const p = smoothstep((t - 0.87) / 0.13);
          this.travelXTarget = 0;
          this.travelYTarget = mix(0, 0.5, p);
          this.travelRotationTarget = 0;
          this.specialScale = mix(-0.02, 0, p);
          this.specialOpacity = 1;
        }
      } else {
        this.specialScale = mix(0, -0.88, out);
        this.specialOpacity = mix(1, 0, out);
        if (t > 0.42) {
          this.specialScale = mix(-0.88, 0, back);
          this.specialOpacity = mix(0, 1, back);
        }
      }
      if (t > 0.68 && !this.specialEmoteStarted) {
        this.specialEmoteStarted = true;
        this.startExpression("CURIOUS_WIDE");
        this.startMouth("MOUTH_O");
        this.activityId = id;
        this.activityStartedAt = this.specialStartedAt;
        this.activityUntil = this.specialStartedAt + duration;
      }
    }

    if (t >= 1) {
      this.specialAction = null;
      this.specialStartedAt = -1;
      this.specialScale = 0;
      this.specialOpacity = 1;
      this.travelXTarget = 0;
      this.travelYTarget = 0;
      this.travelRotationTarget = 0;
      this.travelDepthTarget = 0;
      this.travelYawTarget = 0;
      this.travelPitchTarget = 0;
      this.manualBeat = false;
      this.bodyAction = "SETTLING";
      this.clearBodyTargets();
      this.bodyReleaseAt = this.clock + 850;
    }
  }

  private clearBodyTargets() {
    this.localBodyX = 0;
    this.localBodyY = 0;
    this.localBodyRotation = 0;
    this.localBodyScaleY = 0;
    this.massXTarget = 0;
    this.massYTarget = 0;
    this.massRotationTarget = 0;
    this.massScaleYTarget = 0;
    this.massSkewXTarget = 0;
    this.massSkewYTarget = 0;
    this.massOriginXTarget = 0;
    this.massOriginYTarget = 0.82;
  }

  private startSpin() {
    this.clearBeatCues();
    this.clearBodyTargets();
    this.spinStartedAt = this.clock;
    this.spinRotation = 0;
    this.bodyAction = "SPIN_360";
    this.bodyReleaseAt = this.clock + 2350;
    this.mark("SPIN_360", 2350);
    this.nextBeatAt = Math.max(this.nextBeatAt, this.clock + 2700);
  }

  private startWallImpact(
    id: "WALL_IMPACT_LEFT" | "WALL_IMPACT_RIGHT",
    cfg: BehaviourConfig
  ) {
    this.clearBeatCues();
    this.clearBodyTargets();
    const direction = id === "WALL_IMPACT_LEFT" ? -1 : 1;
    const strength = clamp(cfg.squash / 0.032, 0.8, 1.5);
    this.impactDirection = direction;
    this.impactAt = this.clock + 320;
    this.localBodyX = direction * 31;
    this.localBodyRotation = direction * 2.8;
    this.massXTarget = direction * 14.5;
    this.massRotationTarget = direction * 3.8;
    this.massSkewYTarget = direction * 3.2;
    this.massOriginXTarget = -direction;
    this.localBodyScaleY = 0.025 * strength;
    this.massScaleYTarget = 0.018 * strength;
    this.bodyAction = id;
    this.bodyReleaseAt = this.clock + 1040;
    this.mark(id, 1500);
  }

  private updateSpin() {
    if (this.spinStartedAt < 0) return;
    const elapsed = this.clock - this.spinStartedAt;
    const duration = 1900;
    const t = clamp01(elapsed / duration);
    // One unwrapped turn. At 360 degrees the orientation is identical to
    // neutral, so clearing to zero after completion does not snap visually.
    this.spinRotation = 360 * smoothstep(t);
    const wobbleEnvelope = Math.sin(Math.PI * t);
    const wobble = Math.sin(t * Math.PI * 4.2) * wobbleEnvelope;
    const bob = Math.sin(t * Math.PI * 1.8) * wobbleEnvelope;
    this.localBodyX = wobble * 6;
    this.localBodyY = bob * 3;
    this.localBodyRotation = wobble * 3.4;
    this.localBodyScaleY = (-0.035 + bob * 0.018) * wobbleEnvelope;
    this.massXTarget = wobble * 6.6;
    this.massYTarget = bob * 3.5;
    this.massRotationTarget = wobble * 5.8;
    this.massScaleYTarget = -0.036 * wobbleEnvelope;
    this.massSkewXTarget = -wobble * 4.8;
    this.massSkewYTarget = wobble * 4.4;
    if (t >= 1) {
      this.spinStartedAt = -1;
      // Keep 360° as the spring's equivalent endpoint. Angle wrapping in
      // BlobJellyPhysics then returns to zero's visual orientation without
      // forcing a second backwards turn.
      this.spinRotation = 360;
      this.bodyAction = "SETTLING";
      this.clearBodyTargets();
      this.bodyReleaseAt = this.clock + 850;
    }
  }

  private startBlink(double: boolean, cfg?: BehaviourConfig) {
    this.blinkStartedAt = this.clock;
    this.blinkDouble = double;
    this.lidAction = double ? "DOUBLE_BLINK" : "NORMAL_BLINK";
    this.mark(double ? "DOUBLE_BLINK" : "NORMAL_BLINK", double ? 665 : 280);
    if (cfg) this.nextBlinkAt = this.clock + this.blinkGap(cfg);
  }

  private updateBlink() {
    if (this.blinkStartedAt < 0) {
      this.blinkLid = 1;
      this.blinkState = "open";
      return;
    }
    const elapsed = this.clock - this.blinkStartedAt;
    // A readable anime blink: 90ms close, 60ms hold, 130ms open.
    const cycle = 280;
    const gap = 105;
    const local =
      this.blinkDouble && elapsed >= cycle + gap ? elapsed - cycle - gap : elapsed;
    const inGap = this.blinkDouble && elapsed >= cycle && elapsed < cycle + gap;
    const done = this.blinkDouble ? elapsed >= cycle * 2 + gap : elapsed >= cycle;
    if (done) {
      this.blinkStartedAt = -1;
      this.blinkLid = 1;
      this.blinkState = "open";
      this.lidAction = this.expressionReleaseAt > 0 ? this.lidAction : "MOOD";
      return;
    }
    if (inGap) {
      this.blinkLid = 1;
      this.blinkState = "open";
      return;
    }
    const closeMs = 90;
    const holdMs = 60;
    const min = 0.025;
    if (local < closeMs) {
      const t = smoothstep(local / closeMs);
      this.blinkLid = 1 - t * (1 - min);
      this.blinkState = t > 0.9 ? "closed" : "closing";
    } else if (local < closeMs + holdMs) {
      this.blinkLid = min;
      this.blinkState = "closed";
    } else {
      const t = smoothstep(
        (local - closeMs - holdMs) / (cycle - closeMs - holdMs)
      );
      this.blinkLid = min + t * (1 - min);
      this.blinkState = t < 0.08 ? "closed" : "opening";
    }
  }

  private applyMoodTargets() {
    this.applyMoodEyeTargets();
    this.applyMoodMouthTargets();
    this.applyMoodFace();
  }

  private applyMoodEyeTargets() {
    const mood = MOODS[this.mood];
    this.leftTension.target = mood.leftTension;
    this.rightTension.target = mood.rightTension;
    this.leftScaleX.target = mood.eyeScaleX;
    this.rightScaleX.target = mood.eyeScaleX;
    this.leftScaleY.target = mood.eyeScaleY;
    this.rightScaleY.target = mood.eyeScaleY;
    this.leftRotation.target = 0;
    this.rightRotation.target = 0;
    this.leftBrowRotation.target = 0;
    this.rightBrowRotation.target = 0;
    this.leftLidBias.target = 0;
    this.rightLidBias.target = 0;
    this.leftEyeStyle = -1;
    this.rightEyeStyle = -1;
  }

  private applyMoodFace() {
    const mood = MOOD_FACE[this.mood];
    this.faceStyle = mood.style;
    this.pupilScale.target = mood.pupilScale;
  }

  private applyMoodMouthTargets() {
    const mood = MOODS[this.mood];
    this.mouthX.target = mood.mouthX;
    this.mouthY.target = mood.mouthY;
    this.mouthScaleX.target = mood.mouthScaleX;
    this.mouthScaleY.target = mood.mouthScaleY;
    this.mouthCurve.target = mood.mouthCurve;
    this.mouthO.target = 0;
    this.mouthD.target = mood.mouthD;
    this.mouthCrescent.target = mood.mouthCrescent ?? 0;
    this.setMouthRotationTarget(mood.mouthRotation);
  }

  private setMouthRotationTarget(target: number) {
    // Mouth orientation stays stable. Smile/frown morph belongs to vertical
    // scale, so the artwork never spins or vanishes between expressions.
    this.mouthRotation.target = clamp(target, -12, 12);
    this.mouthTurnStartedAt = -1;
    this.mouthTurnTarget = 0;
    this.mouthTurnSnapped = false;
    this.mouthOpacityValue = 1;
  }

  private updateMouthTurn() {
    this.mouthOpacityValue = 1;
  }

  private stepFaceSprings(dtMs: number) {
    const seconds = Math.min(Math.max(dtMs, 0), 100) / 1000;
    if (seconds <= 0) return;
    const steps = Math.max(1, Math.ceil(seconds * 120));
    const dt = seconds / steps;
    for (let i = 0; i < steps; i += 1) {
      // Posture settles slowly and is critically damped, so an emotional
      // stance reads as the body relaxing into a shape, never as a pop.
      this.postureLift.step(dt, 2.5, 0.95);
      this.posturePuff.step(dt, 2.3, 0.95);
      this.postureDepth.step(dt, 2.2, 0.95);
      this.postureLean.step(dt, 2.4, 0.95);
      this.leftX.step(dt, 9.4, 0.72);
      this.leftY.step(dt, 9.2, 0.72);
      this.rightX.step(dt, 7.9, 0.74);
      this.rightY.step(dt, 7.8, 0.74);
      this.leftScaleX.step(dt, 7, 0.72);
      this.leftScaleY.step(dt, 7.2, 0.72);
      this.rightScaleX.step(dt, 6.5, 0.74);
      this.rightScaleY.step(dt, 6.7, 0.74);
      this.leftRotation.step(dt, 6.4, 0.72);
      this.rightRotation.step(dt, 6.1, 0.74);
      this.leftBrowRotation.step(dt, 5.4, 0.74);
      this.rightBrowRotation.step(dt, 5.4, 0.74);
      this.leftTension.step(dt, 7.8, 0.76);
      this.rightTension.step(dt, 7.2, 0.77);
      this.leftPupilX.step(dt, 13.5, 0.62);
      this.leftPupilY.step(dt, 13.1, 0.64);
      this.rightPupilX.step(dt, 12.9, 0.64);
      this.rightPupilY.step(dt, 12.6, 0.66);
      this.pupilScale.step(dt, 5.2, 0.78);
      this.leftLidBias.step(dt, 6.4, 0.72);
      this.rightLidBias.step(dt, 6.1, 0.74);
      this.mouthX.step(dt, 6.4, 0.7);
      this.mouthY.step(dt, 6.2, 0.7);
      this.mouthScaleX.step(dt, 6.8, 0.69);
      this.mouthScaleY.step(dt, 6.6, 0.7);
      this.mouthRotation.step(dt, 5.5, 0.72);
      this.mouthCurve.step(dt, 5.8, 0.72);
      this.mouthO.step(dt, 6.2, 0.7);
      this.mouthD.step(dt, 5.8, 0.72);
      this.mouthCrescent.step(dt, 5.8, 0.72);
    }
  }

  /** Reused every frame. */
  pose(): PoseDelta {
    const followActive = this.followReleaseAt > 0;
    const scaleY =
      this.localBodyScaleY + (followActive ? this.followScaleYTarget : 0);
    const horizontalSpeed = Math.max(
      Math.abs(this.leftX.velocity),
      Math.abs(this.rightX.velocity)
    );
    const verticalUpSpeed = Math.max(
      0,
      -Math.min(this.leftY.velocity, this.rightY.velocity)
    );
    const velocityNarrow = Math.min(0.065, horizontalSpeed * 0.00165);
    const velocityStretch = Math.min(0.075, verticalUpSpeed * 0.0021);

    const prim = this.primitiveFrame;
    this.delta.blobX =
      this.worldXTarget + this.localBodyX + this.specialX + (followActive ? this.followXTarget : 0) + prim.x;
    this.delta.blobY =
      this.worldYTarget + this.localBodyY + this.specialY + prim.y + this.postureLift.value;
    this.delta.blobDepth = clamp(
      this.worldDepthTarget + this.postureDepth.value,
      -0.2,
      0.2
    );
    // The manual 360 cue is a full unwrapped yaw around the vertical axis.
    // It must not also become a 2D canvas roll; that was why Blob lay sideways
    // in the old recording.
    this.delta.blobYaw = this.travelYawTarget + this.spinRotation;
    this.delta.blobPitch = this.travelPitchTarget;
    this.delta.blobRotation =
      this.worldRotationTarget +
      this.localBodyRotation +
      (followActive ? this.followRotationTarget : 0) +
      prim.rotation;
    this.delta.blobSpin = 0;
    this.delta.blobScale = this.specialScale + prim.scale;
    this.delta.blobOpacity = this.specialOpacity;
    this.delta.faceStyle = this.faceStyle;
    // The emotional stance rides on top of everything else, so travel, squash
    // and primitives all keep working exactly as before.
    const totalScaleY = scaleY + prim.scaleY + this.posturePuff.value;
    const totalMassScaleY =
      this.massScaleYTarget + prim.massScaleY + this.posturePuff.value * 0.45;
    this.delta.blobScaleY = totalScaleY;
    this.delta.blobScaleX = preserveAreaX(totalScaleY);
    this.delta.bodyX = this.massXTarget + prim.massX;
    this.delta.bodyY = this.massYTarget + prim.massY + this.postureLift.value * 0.55;
    this.delta.bodyRotation =
      this.massRotationTarget + prim.massRotation + this.postureLean.value;
    this.delta.bodyScaleY = totalMassScaleY;
    this.delta.bodyScaleX = preserveAreaX(totalMassScaleY);
    this.delta.bodySkewX = this.massSkewXTarget + prim.skewX;
    this.delta.bodySkewY = this.massSkewYTarget + prim.skewY;
    this.delta.bodyOriginX = this.massOriginXTarget;
    this.delta.bodyOriginY = this.massOriginYTarget;
    this.delta.eyeX = 0;
    this.delta.eyeY = 0;
    this.delta.leftEyeX = this.leftX.value;
    this.delta.leftEyeY = this.leftY.value;
    this.delta.leftEyeScaleX = this.leftScaleX.value - velocityNarrow;
    this.delta.leftEyeScaleY = this.leftScaleY.value + velocityStretch;
    this.delta.leftEyeRotation = this.leftRotation.value;
    this.delta.rightEyeX = this.rightX.value;
    this.delta.rightEyeY = this.rightY.value;
    this.delta.rightEyeScaleX = this.rightScaleX.value - velocityNarrow * 0.9;
    this.delta.rightEyeScaleY = this.rightScaleY.value + velocityStretch * 0.92;
    this.delta.rightEyeRotation = this.rightRotation.value;
    this.delta.leftPupilX = this.leftPupilX.value;
    this.delta.leftPupilY = this.leftPupilY.value;
    this.delta.rightPupilX = this.rightPupilX.value;
    this.delta.rightPupilY = this.rightPupilY.value;
    this.delta.pupilScale = clamp(this.pupilScale.value, 0.55, 1.45);
    this.delta.leftLidBias = this.leftLidBias.value;
    this.delta.rightLidBias = this.rightLidBias.value;
    this.delta.leftEyeStyle = this.leftEyeStyle;
    this.delta.rightEyeStyle = this.rightEyeStyle;
    this.delta.leftBrowRotation = this.leftBrowRotation.value;
    this.delta.rightBrowRotation = this.rightBrowRotation.value;
    this.delta.eyeLid = this.blinkLid;
    this.delta.leftEyeTension = this.leftTension.value;
    this.delta.rightEyeTension = this.rightTension.value;
    this.delta.mouthX = this.mouthX.value;
    this.delta.mouthY = this.mouthY.value;
    this.delta.mouthScaleX = this.mouthScaleX.value;
    this.delta.mouthScaleY = this.mouthScaleY.value;
    this.delta.mouthRotation = this.mouthRotation.value;
    this.delta.mouthOpacity = this.mouthOpacityValue;
    this.delta.mouthCurve = this.mouthCurve.value;
    this.delta.mouthO = this.mouthO.value;
    this.delta.mouthD = clamp(this.mouthD.value, 0, 1);
    this.delta.mouthCrescent = clamp(this.mouthCrescent.value, 0, 1);
    return this.delta;
  }

  status(): BehaviourStatus &
    Pick<
      HomeActivityStatus,
      | "mood"
      | "intention"
      | "story"
      | "destination"
      | "depth"
      | "yaw"
      | "pitch"
      | "energy"
      | "curiosity"
      | "memory"
      | "gaze"
      | "lids"
      | "mouth"
      | "body"
      | "nextGazeMs"
      | "nextBlinkMs"
      | "nextMouthMs"
      | "nextBodyMs"
      | "faceStyle"
      | "mind"
    > {
    const active = this.clock < this.activityUntil;
    const mindState = this.mind.state();
    const telemetry = this.mindTelemetry();
    const duration = Math.max(1, this.activityUntil - this.activityStartedAt);
    const next = Math.min(
      this.nextGazeAt,
      this.nextBlinkAt,
      this.nextExpressionAt,
      this.nextMouthAt,
      this.nextBodyAt,
      this.nextMicroAt
    );
    return {
      id: active ? this.activityId : "REST",
      phase: active
        ? clamp01((this.clock - this.activityStartedAt) / duration)
        : 0,
      remainingMs: active ? Math.max(0, this.activityUntil - this.clock) : 0,
      nextBehaviourMs: Math.max(0, next - this.clock),
      blinkState: this.blinkState,
      mood: this.mood,
      gaze: this.gazeAction,
      lids: this.lidAction,
      mouth: this.mouthAction,
      body: this.bodyAction,
      intention: this.plan?.intention ?? this.currentStory?.intention ?? this.lastIntention,
      story: this.plan?.storyId ?? this.currentStory?.id ?? this.lastStoryId,
      destination:
        this.targetSpatialZone ??
        this.plan?.destination ??
        this.currentStory?.destination ??
        this.lastDestination,
      depth: this.delta.blobDepth,
      yaw: this.delta.blobYaw,
      pitch: this.delta.blobPitch,
      // Mind V3 owns these now; the legacy values only survive while the
      // Motion panel's manual overrides are driving the old director.
      energy: this.overridesActive() ? mindState.energy : telemetry.drives.energy,
      curiosity: this.overridesActive()
        ? mindState.curiosity
        : telemetry.drives.curiosity,
      memory: this.overridesActive()
        ? mindState.memory
        : telemetry.recentStories.slice(0, 3).join(" → ") || "new",
      mind: telemetry,
      nextGazeMs: Math.max(0, this.nextGazeAt - this.clock),
      nextBlinkMs: Math.max(0, this.nextBlinkAt - this.clock),
      nextMouthMs: Math.max(0, this.nextMouthAt - this.clock),
      nextBodyMs: Math.max(0, this.nextBodyAt - this.clock),
      faceStyle: this.delta.faceStyle,
    };
  }
}
