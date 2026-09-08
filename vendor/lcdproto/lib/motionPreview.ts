/**
 * Pure motion-preview player for the mobile canvas runtime.
 *
 * Character logic only: Facing × Performance, acrobat timing copied from
 * BehaviourController.startAcrobat/updateAcrobat, and the signature beat
 * timings for pancake / proud puff / tall stretch. The WebView canvas remains
 * the renderer. No DOM, no React Native views.
 *
 * Action ids are the LCDPROTO identifiers. PLAY_SHOWCASE is a preview sequencer
 * only — it is not a catalogue story id.
 */
import { lagAngle, nearestEquivalentAngle, settleTurnAngle } from "./orientation";

export const MOTION_PREVIEW_SOURCE_SHA = "7d26f8ba6b8709d38b071115a025ba0dfeaefbee";

export type AcrobatId =
  | "SPIN_360"
  | "BACKFLIP"
  | "FRONTFLIP"
  | "CARTWHEEL_LEFT"
  | "CARTWHEEL_RIGHT";

export type SignatureMotionId =
  | "SIG_PANCAKE"
  | "SIG_GIANT_PROUD_PUFF"
  | "SIG_TALL_STRETCH";

export type MotionPreviewId =
  | "NEUTRAL"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | AcrobatId
  | SignatureMotionId
  | "PLAY_SHOWCASE";

export const PROFILE_YAW = 90;

export const SHOWCASE_SEQUENCE: readonly Exclude<MotionPreviewId, "PLAY_SHOWCASE">[] = [
  "NEUTRAL",
  "TURN_LEFT",
  "TURN_RIGHT",
  "SPIN_360",
  "BACKFLIP",
  "FRONTFLIP",
  "CARTWHEEL_LEFT",
  "CARTWHEEL_RIGHT",
  "SIG_PANCAKE",
  "SIG_GIANT_PROUD_PUFF",
  "SIG_TALL_STRETCH",
  "NEUTRAL",
];

export interface MotionMouthPose {
  curve: number;
  o: number;
  d: number;
  crescent: number;
  scaleX: number;
  scaleY: number;
}

export interface MotionPreviewSample {
  id: MotionPreviewId | null;
  active: boolean;
  ownsOrientation: boolean;
  facingYaw: number;
  facingPitch: number;
  performanceYaw: number;
  performancePitch: number;
  performanceRoll: number;
  bodyX: number;
  bodyY: number;
  bodyRotation: number;
  blobScaleX: number;
  blobScaleY: number;
  blobScale: number;
  bodyScaleX: number;
  bodyScaleY: number;
  bodySkewX: number;
  gazeX: number;
  gazeY: number;
  eyeOpen: number | null;
  mouth: MotionMouthPose | null;
  blink: boolean;
}

interface AcrobatState {
  id: AcrobatId;
  startedAt: number;
  duration: number;
  baseYaw: number;
  basePitch: number;
  baseRoll: number;
}

interface ActingBeat {
  at: number;
  primitive?: "SQUISH" | "FLATTEN" | "INFLATE" | "STRETCH_UP" | "SETTLE" | "SLUMP";
  amount?: number;
  durationMs?: number;
  mouth?: keyof typeof MOUTH;
  eyes?: number;
  gazeY?: number;
  blink?: boolean;
}

interface ActingState {
  id: SignatureMotionId;
  startedAt: number;
  duration: number;
  beats: readonly ActingBeat[];
}

const MOUTH = {
  SMALL_O: { curve: 0.15, o: 0.55, d: 0.05, crescent: 0, scaleX: 0.92, scaleY: 0.9 },
  FLAT: { curve: 0.02, o: 0, d: 0, crescent: 0, scaleX: 1.08, scaleY: 0.34 },
  GASP: { curve: 0.1, o: 0.85, d: 0.1, crescent: 0, scaleX: 0.86, scaleY: 1.12 },
  CRESCENT_SHARP: { curve: 0.7, o: 0, d: 0.05, crescent: 0.85, scaleX: 1, scaleY: 0.72 },
  D_SMILE: { curve: 0.45, o: 0.1, d: 0.72, crescent: 0.2, scaleX: 1.05, scaleY: 1 },
  SMIRK: { curve: 0.55, o: 0, d: 0.15, crescent: 0.45, scaleX: 1, scaleY: 0.75 },
  MOUTH_RELAX: { curve: 0.82, o: 0, d: 0, crescent: 0.1, scaleX: 1, scaleY: 0.8 },
  YAWN: { curve: 0.05, o: 0.9, d: 0.15, crescent: 0, scaleX: 0.82, scaleY: 1.35 },
} as const;

/** Signature beat tables copied from lib/mind/catalogue/signature.ts. */
const SIGNATURES: Record<SignatureMotionId, { duration: number; beats: readonly ActingBeat[] }> = {
  SIG_PANCAKE: {
    duration: 4400,
    beats: [
      { at: 0, eyes: 1.12, gazeY: 0.65 },
      { at: 260, primitive: "SQUISH", amount: 0.7, durationMs: 850, mouth: "SMALL_O" },
      { at: 620, primitive: "FLATTEN", amount: 1.35, durationMs: 2400, mouth: "FLAT", eyes: 0.42 },
      { at: 1700, mouth: "FLAT", eyes: 0.42 },
      { at: 2500, primitive: "INFLATE", amount: 0.55, durationMs: 1400, mouth: "GASP", eyes: 1.12 },
      { at: 3300, primitive: "SETTLE", amount: 0.6, durationMs: 900, mouth: "CRESCENT_SHARP", eyes: 0.92 },
    ],
  },
  SIG_GIANT_PROUD_PUFF: {
    duration: 4400,
    beats: [
      { at: 0, eyes: 0.92, gazeY: -0.55 },
      { at: 220, primitive: "SQUISH", amount: 1, durationMs: 850, mouth: "SMALL_O" },
      { at: 620, primitive: "INFLATE", amount: 1.3, durationMs: 2400, mouth: "D_SMILE", eyes: 1.08 },
      { at: 1700, mouth: "D_SMILE", eyes: 0.92 },
      { at: 2600, primitive: "SETTLE", amount: 0.5, durationMs: 900, mouth: "SMIRK" },
      { at: 3400, mouth: "MOUTH_RELAX", eyes: 0.9 },
    ],
  },
  SIG_TALL_STRETCH: {
    duration: 4800,
    beats: [
      { at: 0, eyes: 0.28, gazeY: -0.6 },
      { at: 320, primitive: "SQUISH", amount: 0.3, durationMs: 850, mouth: "SMALL_O" },
      { at: 780, primitive: "STRETCH_UP", amount: 1.2, durationMs: 1100, mouth: "YAWN", eyes: 0.22, blink: true },
      { at: 1900, mouth: "YAWN", eyes: 0.28 },
      { at: 2800, primitive: "SLUMP", amount: 0.55, durationMs: 1300, mouth: "MOUTH_RELAX" },
      { at: 3700, primitive: "SETTLE", amount: 0.5, durationMs: 900, eyes: 0.32 },
    ],
  },
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const plateau = (t: number, rise: number, fall: number) => {
  if (t < rise) return smoothstep(t / Math.max(rise, 1e-4));
  if (t < fall) return 1;
  return 1 - smoothstep((t - fall) / Math.max(1 - fall, 1e-4));
};

function emptySample(): MotionPreviewSample {
  return {
    id: null,
    active: false,
    ownsOrientation: false,
    facingYaw: 0,
    facingPitch: 0,
    performanceYaw: 0,
    performancePitch: 0,
    performanceRoll: 0,
    bodyX: 0,
    bodyY: 0,
    bodyRotation: 0,
    blobScaleX: 0,
    blobScaleY: 0,
    blobScale: 0,
    bodyScaleX: 0,
    bodyScaleY: 0,
    bodySkewX: 0,
    gazeX: 0,
    gazeY: 0,
    eyeOpen: null,
    mouth: null,
    blink: false,
  };
}

function samplePrimitive(
  id: NonNullable<ActingBeat["primitive"]>,
  elapsed: number,
  durationMs: number,
  amount: number,
) {
  const p = clamp01(elapsed / Math.max(1, durationMs));
  const a = amount;
  const out = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleY: 0,
    scale: 0,
    massY: 0,
    massScaleY: 0,
  };
  if (id === "SQUISH") {
    const hold = plateau(p, 0.14, 0.64);
    out.y = 10 * hold * a;
    out.scaleY = -0.2 * hold * a;
    out.massY = 5.2 * hold * a;
    out.massScaleY = -0.12 * hold * a;
  } else if (id === "STRETCH_UP") {
    const hold = plateau(p, 0.18, 0.72);
    out.y = -14 * hold * a;
    out.scaleY = 0.24 * hold * a;
    out.massY = -4.8 * hold * a;
    out.massScaleY = 0.12 * hold * a;
    out.scale = 0.04 * hold * a;
  } else if (id === "INFLATE") {
    const hold = plateau(p, 0.14, 0.78);
    out.scale = 0.38 * hold * a;
    out.y = -10 * hold * a;
    out.massScaleY = 0.16 * hold * a;
    out.scaleY = 0.1 * hold * a;
  } else if (id === "FLATTEN") {
    const hold = plateau(p, 0.12, 0.76);
    out.y = 18 * hold * a;
    out.scaleY = -0.42 * hold * a;
    out.massY = 8 * hold * a;
    out.massScaleY = -0.24 * hold * a;
    out.scale = -0.08 * hold * a;
  } else if (id === "SLUMP") {
    const fall = smoothstep(p < 0.7 ? p / 0.7 : 1);
    out.y = 6.5 * fall * a;
    out.scaleY = -0.075 * fall * a;
    out.massY = 3.6 * fall * a;
    out.massScaleY = -0.05 * fall * a;
  } else if (id === "SETTLE") {
    const fall = smoothstep(Math.min(1, p / 0.7));
    out.y = 3.2 * Math.sin(fall * Math.PI) * a;
    out.scaleY = -0.04 * fall * a;
  }
  return out;
}

const isAcrobat = (id: string): id is AcrobatId =>
  id === "SPIN_360" ||
  id === "BACKFLIP" ||
  id === "FRONTFLIP" ||
  id === "CARTWHEEL_LEFT" ||
  id === "CARTWHEEL_RIGHT";

const isSignature = (id: string): id is SignatureMotionId =>
  id === "SIG_PANCAKE" || id === "SIG_GIANT_PROUD_PUFF" || id === "SIG_TALL_STRETCH";

export class MotionPreviewPlayer {
  private clock = 0;
  private facingYaw = 0;
  private facingPitch = 0;
  private facingTargetYaw = 0;
  private facingTargetPitch = 0;
  private performanceYaw = 0;
  private performancePitch = 0;
  private performanceRoll = 0;
  private acrobat: AcrobatState | null = null;
  private acting: ActingState | null = null;
  private currentId: MotionPreviewId | null = null;
  private showcase: Exclude<MotionPreviewId, "PLAY_SHOWCASE">[] | null = null;
  private showcaseIndex = 0;
  private gapUntil = 0;
  private holdUntil = 0;
  private ownsOrientation = false;
  private blinkUntil = 0;
  private blinkedForBeat = -1;

  play(id: string) {
    if (id === "PLAY_SHOWCASE") {
      this.showcase = SHOWCASE_SEQUENCE.slice();
      this.showcaseIndex = 0;
      this.gapUntil = 0;
      this.startListed(this.showcase[0]);
      return;
    }
    this.showcase = null;
    this.startListed(id);
  }

  reset() {
    this.play("NEUTRAL");
    this.ownsOrientation = false;
    this.currentId = null;
  }

  step(dtMs: number) {
    const step = Math.max(0, Math.min(dtMs, 50));
    this.clock += step;
    const dt = step / 1000;
    this.facingYaw = lagAngle(this.facingYaw, this.facingTargetYaw, dt, 0.16);
    this.facingPitch = lagAngle(this.facingPitch, this.facingTargetPitch, dt, 0.16);
    this.updateAcrobat();
    if (this.showcase) {
      if (this.gapUntil === 0 && this.settled()) this.gapUntil = this.clock + 420;
      if (this.gapUntil > 0 && this.clock >= this.gapUntil && this.settled()) this.advanceShowcase();
    }
  }

  sample(): MotionPreviewSample {
    const out = emptySample();
    out.id = this.currentId;
    out.ownsOrientation = this.ownsOrientation;
    out.facingYaw = this.facingYaw;
    out.facingPitch = this.facingPitch;
    out.performanceYaw = this.performanceYaw;
    out.performancePitch = this.performancePitch;
    out.performanceRoll = this.performanceRoll;
    out.active = this.ownsOrientation || this.acrobat !== null || this.acting !== null || this.showcase !== null;
    const travel = this.bodyOffset();
    out.bodyX = travel.x;
    out.bodyY = travel.y;
    out.bodyRotation = travel.rotation;
    out.blobScaleY = travel.scaleY;
    out.bodySkewX = travel.skewX;

    if (this.acting) {
      const elapsed = this.clock - this.acting.startedAt;
      let body = { x: 0, y: 0, rotation: 0, scaleY: 0, scale: 0, massY: 0, massScaleY: 0 };
      let eyes: number | null = null;
      let gazeY = 0;
      let mouth: MotionMouthPose | null = null;
      let blink = false;
      for (let i = 0; i < this.acting.beats.length; i += 1) {
        const beat = this.acting.beats[i];
        if (elapsed + 1 < beat.at) break;
        if (beat.eyes !== undefined) eyes = beat.eyes;
        if (beat.gazeY !== undefined) gazeY = beat.gazeY;
        if (beat.mouth) mouth = { ...MOUTH[beat.mouth] };
        if (beat.blink && this.blinkedForBeat !== i) {
          this.blinkedForBeat = i;
          this.blinkUntil = this.clock + 140;
        }
        if (beat.primitive) {
          const start = beat.at;
          const duration = beat.durationMs ?? 900;
          body = samplePrimitive(beat.primitive, Math.max(0, elapsed - start), duration, beat.amount ?? 1);
        }
      }
      if (this.clock < this.blinkUntil) blink = true;
      out.bodyX = body.x;
      out.bodyY = body.y + body.massY;
      out.bodyRotation = body.rotation;
      out.blobScaleY = body.scaleY;
      out.blobScale = body.scale;
      out.bodyScaleY = body.massScaleY;
      out.blobScaleX = body.scaleY < 0 ? -body.scaleY * 0.55 : body.scale * 0.35;
      out.gazeY = gazeY;
      out.eyeOpen = blink ? 0.05 : eyes;
      out.mouth = mouth;
      out.blink = blink;
      out.active = true;
    }
    return out;
  }

  private startListed(id: string) {
    if (id === "NEUTRAL") {
      this.beginNeutral();
      return;
    }
    if (id === "TURN_LEFT" || id === "TURN_RIGHT") {
      this.clearAcrobat(false);
      this.acting = null;
      this.currentId = id;
      this.ownsOrientation = true;
      this.facingTargetYaw = id === "TURN_LEFT" ? -PROFILE_YAW : PROFILE_YAW;
      this.facingTargetPitch = 0;
      this.holdUntil = this.clock + 1100;
      this.gapUntil = 0;
      return;
    }
    if (isAcrobat(id)) {
      this.acting = null;
      this.startAcrobat(id);
      return;
    }
    if (isSignature(id)) {
      this.clearAcrobat(false);
      const spec = SIGNATURES[id];
      this.acting = { id, startedAt: this.clock, duration: spec.duration, beats: spec.beats };
      this.currentId = id;
      this.ownsOrientation = true;
      this.blinkedForBeat = -1;
      this.holdUntil = this.clock + spec.duration;
      this.gapUntil = 0;
    }
  }

  private beginNeutral() {
    this.clearAcrobat(true);
    this.acting = null;
    this.currentId = "NEUTRAL";
    this.ownsOrientation = true;
    this.facingTargetYaw = 0;
    this.facingTargetPitch = 0;
    this.holdUntil = this.clock + 700;
    this.gapUntil = 0;
  }

  private clearAcrobat(settle: boolean) {
    if (settle) {
      this.performanceYaw = settleTurnAngle(this.performanceYaw);
      this.performancePitch = settleTurnAngle(this.performancePitch);
      this.performanceRoll = settleTurnAngle(this.performanceRoll);
    }
    this.acrobat = null;
  }

  private startAcrobat(id: AcrobatId) {
    this.acting = null;
    const duration = id === "SPIN_360" ? 2200 : id === "BACKFLIP" || id === "FRONTFLIP" ? 1720 : 1840;
    const baseYaw = nearestEquivalentAngle(0, this.performanceYaw);
    const basePitch = nearestEquivalentAngle(0, this.performancePitch);
    const baseRoll = nearestEquivalentAngle(0, this.performanceRoll);
    this.performanceYaw = baseYaw;
    this.performancePitch = basePitch;
    this.performanceRoll = baseRoll;
    this.acrobat = { id, startedAt: this.clock, duration, baseYaw, basePitch, baseRoll };
    this.currentId = id;
    this.ownsOrientation = true;
    this.holdUntil = this.clock + duration + 720;
    this.gapUntil = 0;
  }

  private updateAcrobat() {
    const acrobat = this.acrobat;
    if (!acrobat) return;
    const t = clamp01((this.clock - acrobat.startedAt) / acrobat.duration);
    const anticipationEnd = 0.16;
    const actionEnd = 0.82;
    const actionT = clamp01((t - anticipationEnd) / (actionEnd - anticipationEnd));
    const action = smoothstep(actionT);
    const launch = smoothstep(clamp01(t / anticipationEnd));
    const landing = smoothstep(clamp01((t - actionEnd) / (1 - actionEnd)));
    const airborne = Math.sin(Math.PI * actionT);
    const direction = acrobat.id === "CARTWHEEL_LEFT" ? -1 : 1;
    const { baseYaw, basePitch, baseRoll } = acrobat;

    this.performanceYaw = baseYaw;
    this.performancePitch = basePitch;
    this.performanceRoll = baseRoll;

    if (t < anticipationEnd) {
      if (acrobat.id === "SPIN_360") this.performanceYaw = baseYaw - 16 * launch;
      else if (acrobat.id === "BACKFLIP") this.performancePitch = basePitch + 14 * launch;
      else if (acrobat.id === "FRONTFLIP") this.performancePitch = basePitch - 14 * launch;
      else this.performanceRoll = baseRoll - direction * 12 * launch;
    } else if (t < actionEnd) {
      if (acrobat.id === "SPIN_360") this.performanceYaw = baseYaw - 16 + 376 * action;
      else if (acrobat.id === "BACKFLIP") this.performancePitch = basePitch + 14 - 374 * action;
      else if (acrobat.id === "FRONTFLIP") this.performancePitch = basePitch - 14 + 374 * action;
      else {
        this.performanceRoll = baseRoll - direction * 12 + direction * 372 * action;
        this.performanceYaw = baseYaw + direction * 18 * Math.sin(Math.PI * action);
      }
    } else if (acrobat.id === "SPIN_360") this.performanceYaw = baseYaw + 360;
    else if (acrobat.id === "BACKFLIP") this.performancePitch = basePitch - 360;
    else if (acrobat.id === "FRONTFLIP") this.performancePitch = basePitch + 360;
    else this.performanceRoll = baseRoll + direction * 360;

    if (t >= 1) {
      if (acrobat.id === "SPIN_360") this.performanceYaw = baseYaw + 360;
      else if (acrobat.id === "BACKFLIP") this.performancePitch = basePitch - 360;
      else if (acrobat.id === "FRONTFLIP") this.performancePitch = basePitch + 360;
      else this.performanceRoll = baseRoll + direction * 360;
      this.acrobat = null;
      this.scheduleGap();
    }
  }

  /** Body travel for the current acrobat frame. Called from sample via stored state. */
  bodyOffset() {
    const acrobat = this.acrobat;
    if (!acrobat) return { x: 0, y: 0, rotation: 0, scaleY: 0, skewX: 0 };
    const t = clamp01((this.clock - acrobat.startedAt) / acrobat.duration);
    const anticipationEnd = 0.16;
    const actionEnd = 0.82;
    const actionT = clamp01((t - anticipationEnd) / (actionEnd - anticipationEnd));
    const action = smoothstep(actionT);
    const launch = smoothstep(clamp01(t / anticipationEnd));
    const landing = smoothstep(clamp01((t - actionEnd) / (1 - actionEnd)));
    const airborne = Math.sin(Math.PI * actionT);
    const direction = acrobat.id === "CARTWHEEL_LEFT" ? -1 : 1;
    const out = { x: 0, y: 0, rotation: 0, scaleY: 0, skewX: 0 };
    if (t < anticipationEnd) {
      out.y = 7.5 * launch;
      out.scaleY = -0.115 * launch;
      out.skewX = acrobat.id.startsWith("CARTWHEEL") ? direction * 1.8 * launch : 0;
    } else if (t < actionEnd) {
      out.y = -58 * airborne;
      out.scaleY = 0.05 * airborne;
      if (acrobat.id === "SPIN_360") {
        const wobble = Math.sin(actionT * Math.PI * 3.4) * airborne;
        out.x = wobble * 4.2;
        out.rotation = wobble * 2.2;
        out.skewX = -wobble * 3.2;
      } else if (acrobat.id === "BACKFLIP") {
        out.x = -7 * Math.sin(Math.PI * action);
        out.rotation = -2.5 * Math.sin(Math.PI * action);
      } else if (acrobat.id === "FRONTFLIP") {
        out.x = 7 * Math.sin(Math.PI * action);
        out.rotation = 2.5 * Math.sin(Math.PI * action);
      } else {
        out.x = direction * 54 * Math.sin(Math.PI * actionT);
        out.skewX = direction * 3.2 * airborne;
      }
    } else {
      const impact = Math.sin(landing * Math.PI);
      out.y = 6.2 * (1 - landing) - 3.2 * impact;
      out.scaleY = -0.18 * (1 - landing) + 0.05 * impact;
      if (acrobat.id.startsWith("CARTWHEEL")) {
        out.x = direction * 10 * (1 - landing);
        out.skewX = direction * 2.4 * (1 - landing);
      }
    }
    return out;
  }

  private settled() {
    if (this.acrobat) return false;
    if (this.acting && this.clock < this.acting.startedAt + this.acting.duration) return false;
    if (this.clock < this.holdUntil) return false;
    return true;
  }

  private scheduleGap() {
    if (!this.showcase) return;
    this.gapUntil = this.clock + 420;
  }

  private advanceShowcase() {
    if (!this.showcase) return;
    this.showcaseIndex += 1;
    if (this.showcaseIndex >= this.showcase.length) {
      this.showcase = null;
      this.currentId = "NEUTRAL";
      return;
    }
    this.gapUntil = 0;
    this.startListed(this.showcase[this.showcaseIndex]);
  }
}
