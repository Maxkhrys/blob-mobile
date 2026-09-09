import type { CloudSettingsValues } from "../character/cloudSliders";

export const LCDPROTO_SOURCE_BRANCH = "feat/grok-terra-orientation-synthesis-v1" as const;
export const LCDPROTO_SOURCE_SHA =
  "7d26f8ba6b8709d38b071115a025ba0dfeaefbee" as const;
export const LCDPROTO_MAIN_REFERENCE_SHA =
  "bd2460fbc78c1d1e6dfe9cac4b362ddd887df6c3" as const;

export type DevLabSection =
  | "character"
  | "motion"
  | "physics"
  | "cloud"
  | "face"
  | "expressions"
  | "performance"
  | "environment"
  | "states"
  | "screens"
  | "playback"
  | "debug";

// Shape intentionally matches LCDPROTO/lib/expressions/types.ts.
export interface EyeRecipe {
  socketX: number;
  socketY: number;
  width: number;
  height: number;
  open: number;
  browLift: number;
  browTilt: number;
  lidBias?: number;
}

export interface MouthRecipe {
  x: number;
  y: number;
  width: number;
  height: number;
  curve: number;
  dAmount: number;
  oAmount: number;
  crescentSmileAmount?: number;
}

export interface ExpressionRecipe {
  id: string;
  label: string;
  category: "core" | "custom" | "anime" | "state";
  isCustom?: boolean;
  leftEye: EyeRecipe;
  rightEye: EyeRecipe;
  mouth: MouthRecipe;
  defaultTransitionMs?: number;
  description?: string;
}

export const DEFAULT_EYE_RECIPE: EyeRecipe = {
  socketX: 0,
  socketY: 0,
  width: 1,
  height: 1,
  open: 1,
  browLift: 0,
  browTilt: 0,
  lidBias: 0,
};

export const DEFAULT_MOUTH_RECIPE: MouthRecipe = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  curve: 0.82,
  dAmount: 0,
  oAmount: 0,
  crescentSmileAmount: 0,
};

export function createBlankExpressionRecipe(
  id = `mobile-${Date.now()}`,
  label = "Mobile recipe",
): ExpressionRecipe {
  return {
    id,
    label,
    category: "custom",
    isCustom: true,
    leftEye: { ...DEFAULT_EYE_RECIPE },
    rightEye: { ...DEFAULT_EYE_RECIPE },
    mouth: { ...DEFAULT_MOUTH_RECIPE },
    defaultTransitionMs: 180,
  };
}

export type DevLabRuntimeCommand =
  | { type: "play" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "center" }
  | { type: "clearTrails" }
  | { type: "triggerBehaviour"; id: string }
  | { type: "triggerMotion"; id: string }
  | { type: "triggerPerformance"; id: string }
  | { type: "triggerPrimitive"; id: string; amount?: number; direction?: number }
  | { type: "applyExpressionRecipe"; recipe: ExpressionRecipe }
  | { type: "clearExpressionRecipe" }
  | { type: "setAutoMind"; enabled: boolean }
  | { type: "setMood"; id: string }
  | { type: "setActingCycle"; id: string }
  | { type: "setActingIntensity"; id: string }
  | { type: "nextThought" }
  | { type: "playShowcase" }
  | { type: "playStory"; id: string }
  | { type: "playSignature"; id: string }
  | { type: "resetMind" }
  | { type: "setParityTrace"; enabled: boolean }
  | { type: "setOrientation"; yaw: number; pitch: number }
  | {
      type: "runTouchTest";
      id: "tap" | "hold" | "drag" | "flick" | "wall";
    }
  | {
      type: "setFaceOverride";
      values: Partial<{
        eyeX: number;
        eyeY: number;
        eyeLid: number;
        leftEyeScaleX: number;
        leftEyeScaleY: number;
        rightEyeScaleX: number;
        rightEyeScaleY: number;
        leftEyeRotation: number;
        rightEyeRotation: number;
        leftLidBias: number;
        rightLidBias: number;
        pupilScale: number;
        leftPupilX: number;
        leftPupilY: number;
        rightPupilX: number;
        rightPupilY: number;
        mouthCurve: number;
        mouthO: number;
        mouthD: number;
        mouthCrescent: number;
        mouthTongue: number;
        mouthScaleX: number;
        mouthScaleY: number;
        mouthX: number;
        mouthY: number;
      }>;
    }
  | { type: "clearFaceOverride" };

export interface DevLabTelemetry {
  fps: number;
  frameTimeMs: number;
  renderTimeMs?: number;
  state: string;
  behaviourId: string | null;
  performanceId: string | null;
  performancePlaying: boolean;
  performanceTimeMs: number;
  expressionRecipeId: string | null;
  yaw: number;
  pitch: number;
  gazeX: number;
  gazeY: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  dragging: boolean;
  touching?: boolean;
  touchMoved?: boolean;
  grabPressure?: number;
  wallPressure: number;
  contactX?: number;
  contactY?: number;
  contactDistance?: number;
  contactRelX?: number;
  contactRelY?: number;
  influenceRadius?: number;
  gripPullX?: number;
  gripPullY?: number;
  accelX?: number;
  accelY?: number;
  cornerBlend?: number;
  flickStretch?: number;
  faceShiftX?: number;
  faceShiftY?: number;
  dragFaceYaw?: number;
  dragFacePitch?: number;
  wispCount: number;
  lobeDeformationMagnitude?: number;
  faceVisibility?: number;
  active: boolean;
  reducedMotion?: boolean;
  parityTrace?: boolean;
  lcdprotoSha: string;
  autoMind?: boolean;
  storyId?: string | null;
  phase?: string | null;
  mood?: string | null;
  cycle?: string | null;
  intensity?: string | null;
  primitive?: string | null;
  cue?: string | null;
  actingAmount?: number;
  blobScale?: number;
  mouthTongue?: number;
  mouthAction?: string | null;
  actingScaleX?: number;
  actingScaleY?: number;
  actingPuff?: number;
  bodyScaleX?: number;
  bodyScaleY?: number;
  facingYaw?: number;
  facingPitch?: number;
  performanceYaw?: number;
  performancePitch?: number;
  performanceRoll?: number;
  coreYaw?: number;
  corePitch?: number;
  shellYaw?: number;
  shellPitch?: number;
  crownYaw?: number;
  crownPitch?: number;
  massYaw?: number;
  massPitch?: number;
  recentStories?: string[];
  mind?: Record<string, unknown> | null;
  stages?: {
    controller: Record<string, unknown>;
    jellyTarget: Record<string, unknown>;
    physics: Record<string, unknown>;
    rig: Record<string, unknown>;
    cloud: Record<string, unknown>;
  } | null;
}

export interface DevPreset {
  id: string;
  name: string;
  cloudSettings: CloudSettingsValues;
  driverYaw: number;
  driverPitch: number;
  showPupils: boolean;
  environment: string;
  createdAt: number;
}
