/**
 * Canonical Cloud Character Types
 * Synchronized with LCDPROTO: components/experimental/cloud-blob/cloudTypes.ts & lib/characters.ts
 */

export type LobeId =
  | 'bottomBelly'
  | 'baseLeft'
  | 'baseRight'
  | 'core'
  | 'leftCheek'
  | 'rightCheek'
  | 'topCrown'
  | 'frontVeil';

export interface LobeDefinition {
  id: LobeId;
  name: string;
  baseX: number;
  baseY: number;
  radiusX: number;
  radiusY: number;
  baseOpacity: number;
  baseSoftness: number;
  lagFactor: number;
  stiffness: number;
  damping: number;
  breathPhase: number;
  breathAmp: number;
  depth: number; // Order: <0 rear base, 0 core, 1-2 mid crown/cheeks, 10 front veil over face
}

export interface LobeState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  rotation: number;
}

export interface CloudDeformationParams {
  scale: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  x: number;
  y: number;
  squash: number;
  stretch: number;
  lean: number;
  puff: number;
  leftBulge: number;
  rightBulge: number;
  topBulge: number;
  bottomSag: number;
  coreDensity: number;
  lobeSoftness: number;
  faceEmbedDepth: number; // 0 (crisp floating) to 0.35 (submerged in mist), default 0.12
  fluffiness: number; // 0 (smooth) to 2.0 (ultra-billowy cumulus fluff), default 1.2
  lightStrength: number;
  lightAngle: number; // Key light angle in degrees, default -45 (top-left sunlight)
  cheekBlush: number; // 0 to 1 warm blush intensity
  cloudBrows: boolean; // Render floating wispy cloud brows
  gazeX: number; // -1 to 1 iris glance
  gazeY: number; // -1 to 1 iris glance
  turnYaw?: number; // -45 to 45 directional turning angle in degrees
  turnPitch?: number; // -30 to 30 directional pitch angle in degrees
}

export interface CloudMotionConfig {
  floatAmount: number;
  driftAmount: number;
  wobbleAmount: number;
  lobeLag: number;
  springStiffness: number;
  springDamping: number;
}

export interface CloudFaceSettings {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CloudColourConfig {
  body: string;
  innerGlow: string;
  edge: string;
  coreTint: string;
  glowIntensity: number;
  density: number;
  translucency: number;
}

export interface CloudTrailConfig {
  enabled: boolean;
  spawnRate: number;
  lifetime: number;
  fadeSpeed: number;
  trailStrength: number;
  driftAmount: number;
}

export interface SuspendedDroplet {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  driftPhase: number;
  driftSpeed: number;
}

export interface CloudWisp {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  opacity: number;
  initialOpacity: number;
  age: number;
  maxLife: number;
  softness: number;
  color: string;
  angle: number;
  shape: number;
  curl: number;
}
