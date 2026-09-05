import type { CloudSettingsValues } from "../character/cloudSliders";

export const LCDPROTO_SOURCE_SHA =
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
  | { type: "triggerPerformance"; id: string }
  | { type: "applyExpressionRecipe"; recipe: ExpressionRecipe }
  | { type: "clearExpressionRecipe" };

export interface DevLabTelemetry {
  fps: number;
  frameTimeMs: number;
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
  wallPressure: number;
  wispCount: number;
  active: boolean;
  lcdprotoSha: string;
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
