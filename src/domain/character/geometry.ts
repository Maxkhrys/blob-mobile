/**
 * Canonical Cloud Character Geometry & Authored Lobes
 * Synchronized with LCDPROTO: components/experimental/cloud-blob/cloudLobeSystem.ts
 */

import {
  LobeDefinition,
  CloudDeformationParams,
  CloudMotionConfig,
  CloudFaceSettings,
  SuspendedDroplet,
} from './types';

export const DEFAULT_DEFORMATION: CloudDeformationParams = {
  scale: 1.0,
  scaleX: 1.0,
  scaleY: 1.0,
  rotation: 0,
  x: 0,
  y: 0,
  squash: 0,
  stretch: 0,
  lean: 0,
  puff: 0,
  leftBulge: 0,
  rightBulge: 0,
  topBulge: 0,
  bottomSag: 0,
  coreDensity: 0.95,
  lobeSoftness: 1.0,
  faceEmbedDepth: 0.12,
  fluffiness: 1.2,
  lightStrength: 1.0,
  lightAngle: -45,
  cheekBlush: 0.45,
  cloudBrows: true,
  gazeX: 0,
  gazeY: 0,
  turnYaw: 0,
  turnPitch: 0,
};

export const DEFAULT_MOTION_CONFIG: CloudMotionConfig = {
  floatAmount: 4.5,
  driftAmount: 2.5,
  wobbleAmount: 0,
  lobeLag: 1.0,
  springStiffness: 145,
  springDamping: 14.5,
};

export const DEFAULT_FACE_SETTINGS: CloudFaceSettings = {
  offsetX: 0,
  offsetY: -6,
  scale: 1.02,
};

/**
 * 7 Character-forming lobes + 1 front veil.
 * Authored for 466x466 AMOLED screen space.
 * Establishes a recognizable pear-shaped character silhouette with a rounded crown.
 */
export const LOBE_DEFINITIONS: readonly LobeDefinition[] = [
  // 1. REAR BASE LOBES (depth = -1): Solid, wide lower mass
  {
    id: 'bottomBelly',
    name: 'Bottom Center Belly',
    baseX: 0,
    baseY: 76,
    radiusX: 90,
    radiusY: 52,
    baseOpacity: 0.9,
    baseSoftness: 1.25,
    lagFactor: 0.88,
    stiffness: 95,
    damping: 11.5,
    breathPhase: 3.1,
    breathAmp: 0.05,
    depth: -1,
  },
  {
    id: 'baseLeft',
    name: 'Base Fluff Left',
    baseX: -92,
    baseY: 56,
    radiusX: 68,
    radiusY: 54,
    baseOpacity: 0.88,
    baseSoftness: 1.2,
    lagFactor: 0.72,
    stiffness: 110,
    damping: 12.0,
    breathPhase: 2.4,
    breathAmp: 0.045,
    depth: -1,
  },
  {
    id: 'baseRight',
    name: 'Base Fluff Right',
    baseX: 96,
    baseY: 54,
    radiusX: 72,
    radiusY: 56,
    baseOpacity: 0.88,
    baseSoftness: 1.2,
    lagFactor: 0.76,
    stiffness: 105,
    damping: 12.0,
    breathPhase: 3.8,
    breathAmp: 0.04,
    depth: -1,
  },

  // 2. CENTRAL CORE (depth = 0): Dominant mass, holds character anchor
  {
    id: 'core',
    name: 'Central Cloud Core',
    baseX: 0,
    baseY: 4,
    radiusX: 94,
    radiusY: 82,
    baseOpacity: 0.98,
    baseSoftness: 0.95,
    lagFactor: 0.08,
    stiffness: 240,
    damping: 20.0,
    breathPhase: 0.0,
    breathAmp: 0.03,
    depth: 0,
  },

  // 3. MID LOBES (depth = 1): Sculpted cheeks flanking eyes
  {
    id: 'leftCheek',
    name: 'Volumetric Left Cheek',
    baseX: -76,
    baseY: -8,
    radiusX: 70,
    radiusY: 62,
    baseOpacity: 0.86,
    baseSoftness: 1.15,
    lagFactor: 0.52,
    stiffness: 135,
    damping: 13.0,
    breathPhase: 1.2,
    breathAmp: 0.044,
    depth: 1,
  },
  {
    id: 'rightCheek',
    name: 'Asymmetric Right Cheek',
    baseX: 74,
    baseY: -12,
    radiusX: 66,
    radiusY: 58,
    baseOpacity: 0.84,
    baseSoftness: 1.15,
    lagFactor: 0.56,
    stiffness: 130,
    damping: 13.0,
    breathPhase: 1.8,
    breathAmp: 0.04,
    depth: 1,
  },

  // 4. TOP CROWN (depth = 2): Friendly dome silhouette
  {
    id: 'topCrown',
    name: 'Top Head Crown',
    baseX: -2,
    baseY: -68,
    radiusX: 76,
    radiusY: 54,
    baseOpacity: 0.9,
    baseSoftness: 1.1,
    lagFactor: 0.42,
    stiffness: 155,
    damping: 15.0,
    breathPhase: 0.7,
    breathAmp: 0.046,
    depth: 2,
  },

  // 5. FRONT VEIL (depth = 10): Translucent mist over cheeks and lower socket edges
  {
    id: 'frontVeil',
    name: 'Facial Submersion Veil',
    baseX: 0,
    baseY: 28,
    radiusX: 84,
    radiusY: 48,
    baseOpacity: 0.38,
    baseSoftness: 1.45,
    lagFactor: 0.32,
    stiffness: 160,
    damping: 16.0,
    breathPhase: 0.4,
    breathAmp: 0.035,
    depth: 10,
  },
];

export interface SubPuff {
  parentLobe: string;
  offsetX: number;
  offsetY: number;
  radius: number;
  opacity: number;
  depth: number;
  lightShading: number;
}

export const LOBE_SUB_PUFFS: readonly SubPuff[] = [
  { parentLobe: 'topCrown', offsetX: -38, offsetY: -16, radius: 36, opacity: 0.75, depth: 1.8, lightShading: 0.95 },
  { parentLobe: 'topCrown', offsetX: 34, offsetY: -14, radius: 34, opacity: 0.72, depth: 1.7, lightShading: 0.85 },
  { parentLobe: 'leftCheek', offsetX: -28, offsetY: -18, radius: 38, opacity: 0.68, depth: 1.2, lightShading: 0.92 },
  { parentLobe: 'rightCheek', offsetX: 26, offsetY: -14, radius: 36, opacity: 0.65, depth: 1.1, lightShading: 0.78 },
  { parentLobe: 'baseLeft', offsetX: -22, offsetY: 18, radius: 42, opacity: 0.7, depth: -0.8, lightShading: 0.6 },
  { parentLobe: 'baseRight', offsetX: 24, offsetY: 16, radius: 44, opacity: 0.7, depth: -0.7, lightShading: 0.55 },
];

export const SUSPENDED_DROPLETS: readonly SuspendedDroplet[] = [
  { x: -118, y: -42, radius: 2.8, brightness: 0.95, driftPhase: 0.2, driftSpeed: 0.8 },
  { x: 122, y: -36, radius: 2.4, brightness: 0.85, driftPhase: 1.5, driftSpeed: 0.65 },
  { x: -136, y: 22, radius: 3.2, brightness: 0.75, driftPhase: 3.1, driftSpeed: 0.5 },
  { x: 142, y: 34, radius: 3.0, brightness: 0.7, driftPhase: 4.2, driftSpeed: 0.55 },
  { x: -64, y: -108, radius: 2.2, brightness: 0.9, driftPhase: 2.1, driftSpeed: 0.9 },
  { x: 58, y: -104, radius: 2.5, brightness: 0.88, driftPhase: 5.4, driftSpeed: 0.75 },
  { x: -102, y: 84, radius: 3.4, brightness: 0.65, driftPhase: 0.8, driftSpeed: 0.45 },
  { x: 108, y: 88, radius: 3.2, brightness: 0.6, driftPhase: 1.2, driftSpeed: 0.4 },
];
