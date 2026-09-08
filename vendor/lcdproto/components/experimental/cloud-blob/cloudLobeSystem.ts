/**
 * Procedural Cloud Blob - Multi-Lobe Soft-Body & Physics Engine
 *
 * Implements an intentional 7-lobe volumetric character silhouette with:
 * - Dominant central core with dense, darker mass
 * - Distinct sculpted top crown (clear dome head)
 * - Fuller pear-shaped lower mass and asymmetric cheeks
 * - Second-order damped harmonic springs with per-lobe lag hierarchy
 * - Asynchronous, out-of-sync breathing cycles
 * - Deterministic suspended droplets
 * - Parametric deformations (squash, stretch, lean, puff, bulges, sag)
 */

import {
  type LobeDefinition,
  type LobeState,
  type CloudDeformationParams,
  type CloudMotionConfig,
  type CloudColourConfig,
  type SuspendedDroplet,
  type CloudPresetName,
} from "./cloudTypes";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Smooth 1→0 falloff. 1 at the origin, 0 at `radius`. */
function smoothFalloff(dist: number, radius: number) {
  if (radius <= 1e-3) return dist <= 0 ? 1 : 0;
  const t = clamp(dist / radius, 0, 1);
  return 1 - t * t * (3 - 2 * t);
}

/** Gaussian used for local grab dent. Cheap, portable, no tables. */
function gaussianFalloff(dist: number, sigma: number) {
  const s = Math.max(1, sigma);
  return Math.exp(-(dist * dist) / (2 * s * s));
}

/**
 * Authored acting → local lobe layout. Pancake/stretch already own overall
 * axes through actingScaleX/Y; this channel only redistributes masses so the
 * silhouette change is not a global oval. Does not double-amplify axes.
 */
export function actingLobeLayout(
  actingX = 1,
  actingY = 1,
  actingPuff = 0,
): { squash: number; stretch: number; puff: number } {
  return {
    squash: clamp((actingX - actingY) * 0.92, 0, 0.8),
    stretch: clamp((actingY - actingX) * 0.92, 0, 0.75),
    puff: clamp(actingPuff, 0, 1),
  };
}

export const DEFAULT_DEFORMATION: CloudDeformationParams = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  x: 0,
  y: 0,
  squash: 0.36,
  stretch: 0.28,
  lean: 8.0,
  puff: 0.40,
  leftBulge: 0,
  rightBulge: 0,
  topBulge: 0,
  bottomSag: 0,
  coreDensity: 1.12,
  lobeSoftness: 1.05,
  faceEmbedDepth: 0.17,
  fluffiness: 1.05,
  lightAngle: -75,
  lightStrength: 0.50,
  cheekBlush: 0.14,
  cloudBrows: false,
  gazeX: 0,
  gazeY: 0,
};

export const DEFAULT_MOTION_CONFIG: CloudMotionConfig = {
  floatAmount: 4.5,
  driftAmount: 2.5,
  wobbleAmount: 0,
  lobeLag: 1.0,
  springStiffness: 145,
  springDamping: 14.5,
};

export const DEFAULT_COLOUR: CloudColourConfig = {
  body: "#c4a5ff",
  innerGlow: "#ac90d5",
  edge: "#c59ffe",
  coreTint: "#992fa7",
  glowIntensity: 1.15,
  density: 0.98,
  translucency: 0.8,
};

export const COLOUR_PRESETS: Record<string, CloudColourConfig> = {
  "Cool Mist": {
    body: "#d8e6ff", // soft cool blue-violet mist
    innerGlow: "#7b94ff", // luminous periwinkle inner glow
    edge: "#eaf3ff", // ethereal pale cyan rim
    coreTint: "#627cb5", // darker dense inner core
    glowIntensity: 1.0,
    density: 0.95,
    translucency: 0.82,
  },
  "Purple Void": DEFAULT_COLOUR,
  "Baby Blue": {
    body: "#bce8ff",
    innerGlow: "#36a3f7",
    edge: "#eaf6ff",
    coreTint: "#3b6d9e",
    glowIntensity: 1.05,
    density: 0.92,
    translucency: 0.85,
  },
  "Emerald Vapor": {
    body: "#baf5db",
    innerGlow: "#18b584",
    edge: "#e8fff5",
    coreTint: "#227056",
    glowIntensity: 1.0,
    density: 0.94,
    translucency: 0.82,
  },
  "Blush Rose": {
    body: "#ffd0e2",
    innerGlow: "#f54897",
    edge: "#fff2f7",
    coreTint: "#9c3866",
    glowIntensity: 1.1,
    density: 0.94,
    translucency: 0.82,
  },
  "Golden Dawn": {
    body: "#ffe5b8",
    innerGlow: "#f58814",
    edge: "#fffbe8",
    coreTint: "#94581e",
    glowIntensity: 1.1,
    density: 0.95,
    translucency: 0.82,
  },
};

/**
 * 7 Character-forming lobes + 1 front veil.
 * Authored for 466x466 AMOLED screen space.
 * Establishes a recognizable pear-shaped character silhouette with a rounded crown.
 */
export const LOBE_DEFINITIONS: readonly LobeDefinition[] = [
  // 1. REAR BASE LOBES (depth = -1): Solid, wide lower mass
  {
    id: "bottomBelly",
    name: "Bottom Center Belly",
    baseX: 0,
    baseY: 76,
    radiusX: 90,
    radiusY: 52,
    baseOpacity: 0.9,
    baseSoftness: 1.25,
    lagFactor: 0.88, // Heaviest mass, settles last
    stiffness: 95,
    damping: 11.0,
    breathPhase: 4.2,
    breathAmp: 0.048,
    depth: -2,
  },
  {
    id: "baseLeft",
    name: "Lower Left Base",
    baseX: -72,
    baseY: 52,
    radiusX: 86,
    radiusY: 66,
    baseOpacity: 0.92,
    baseSoftness: 1.2,
    lagFactor: 0.74,
    stiffness: 110,
    damping: 12.0,
    breathPhase: 3.14,
    breathAmp: 0.042,
    depth: -1,
  },
  {
    id: "baseRight",
    name: "Lower Right Base",
    baseX: 70,
    baseY: 54,
    radiusX: 84,
    radiusY: 64,
    baseOpacity: 0.9,
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
    id: "core",
    name: "Central Cloud Core",
    baseX: 0,
    baseY: 4,
    radiusX: 94,
    radiusY: 82,
    baseOpacity: 0.98,
    baseSoftness: 0.95,
    lagFactor: 0.08, // Leads character motion right after face
    stiffness: 240,
    damping: 20.0,
    breathPhase: 0.0,
    breathAmp: 0.03,
    depth: 0,
  },

  // 3. MID LOBES (depth = 1): Sculpted cheeks flanking eyes
  {
    id: "leftCheek",
    name: "Volumetric Left Cheek",
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
    id: "rightCheek",
    name: "Asymmetric Right Cheek",
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
    id: "topCrown",
    name: "Top Head Crown",
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
    id: "frontVeil",
    name: "Front Translucent Mist Veil",
    baseX: 0,
    baseY: 8,
    radiusX: 76,
    radiusY: 62,
    baseOpacity: 0.14,
    baseSoftness: 1.4,
    lagFactor: 0.26,
    stiffness: 180,
    damping: 16.5,
    breathPhase: 0.4,
    breathAmp: 0.025,
    depth: 10,
  },
];

export interface LobeSubPuff {
  offsetX: number;
  offsetY: number;
  radiusRatio: number;
  softnessMult?: number;
  phaseOffset?: number;
}

/**
 * Organic cumulus sub-puff billow clusters for each lobe.
 * Generates natural fluffy cauliflower-like cloud ridges along each lobe perimeter.
 */
export const LOBE_SUB_PUFFS: Partial<Record<string, readonly LobeSubPuff[]>> = {
  topCrown: [
    { offsetX: -30, offsetY: -24, radiusRatio: 0.58, phaseOffset: 0.7 },
    { offsetX: 30, offsetY: -14, radiusRatio: 0.45, phaseOffset: 1.7 },
  ],
  leftCheek: [
    { offsetX: -32, offsetY: -18, radiusRatio: 0.55, phaseOffset: 1.2 },
  ],
  rightCheek: [
    { offsetX: 30, offsetY: -8, radiusRatio: 0.5, phaseOffset: 2.1 },
  ],
  baseLeft: [
    { offsetX: -32, offsetY: 12, radiusRatio: 0.52, phaseOffset: 2.5 },
  ],
  baseRight: [
    { offsetX: 30, offsetY: 16, radiusRatio: 0.48, phaseOffset: 2.8 },
  ],
};

/**
 * 5 Restrained internal light motes deep within the cloud volume.
 * Gives subtle, living bioluminescent / sunlit moisture twinkle without cluttering or reading as glitter.
 */
export const SUSPENDED_DROPLETS: readonly SuspendedDroplet[] = [
  {
    x: -28,
    y: -22,
    radius: 2.2,
    brightness: 0.55,
    driftPhase: 0.4,
    driftSpeed: 0.45,
  },
  {
    x: 32,
    y: -18,
    radius: 2.0,
    brightness: 0.5,
    driftPhase: 2.2,
    driftSpeed: 0.38,
  },
  {
    x: -34,
    y: 22,
    radius: 1.8,
    brightness: 0.45,
    driftPhase: 4.1,
    driftSpeed: 0.42,
  },
  {
    x: 30,
    y: 26,
    radius: 1.9,
    brightness: 0.48,
    driftPhase: 5.3,
    driftSpeed: 0.35,
  },
  {
    x: 0,
    y: -38,
    radius: 2.4,
    brightness: 0.6,
    driftPhase: 1.2,
    driftSpeed: 0.4,
  },
];

export function createLobeStates(): Record<string, LobeState> {
  const states: Record<string, LobeState> = {};
  for (const def of LOBE_DEFINITIONS) {
    states[def.id] = {
      x: def.baseX,
      y: def.baseY,
      vx: 0,
      vy: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: def.baseOpacity,
      rotation: 0,
    };
  }
  return states;
}

export function computeLobeTarget(
  def: LobeDefinition,
  params: CloudDeformationParams,
  motion: CloudMotionConfig,
  characterVx: number,
  characterVy: number,
  idleTime: number,
  out = {
    targetX: 0,
    targetY: 0,
    targetScaleX: 1,
    targetScaleY: 1,
    targetOpacity: 1,
    targetRotation: 0,
  },
): {
  targetX: number;
  targetY: number;
  targetScaleX: number;
  targetScaleY: number;
  targetOpacity: number;
  targetRotation: number;
} {
  const puff = params.puff;
  const sliderSquash = clamp(params.squash, 0, 0.75);
  const sliderStretch = clamp(params.stretch, 0, 0.65);
  const layout = actingLobeLayout(
    params.actingScaleX ?? 1,
    params.actingScaleY ?? 1,
    params.actingPuff ?? 0,
  );
  // Position offsets come from slider emotes AND authored acting. Axis scale
  // from pancake/stretch is applied later via actingScale, so layout squash
  // must not also pinch sx/sy or the pose double-amplifies.
  const squash = clamp(sliderSquash + layout.squash, 0, 0.85);
  const stretch = clamp(sliderStretch + layout.stretch, 0, 0.75);
  const lean = params.lean;

  let tx = def.baseX;
  let ty = def.baseY;

  // 1. Out-of-sync gentle idle breathing
  const calm = 0.35 + 0.65 * Math.pow(Math.sin(idleTime * 0.16), 2);
  const breathCycle =
    Math.sin(idleTime * 1.2 + def.breathPhase) * def.breathAmp * calm;
  const breathScale = 1 + breathCycle;

  // 2. Squash & Stretch
  if (squash > 0) {
    if (def.id === "topCrown") {
      ty += squash * 38;
    } else if (def.id === "baseLeft") {
      tx -= squash * 28;
      ty += squash * 12;
    } else if (def.id === "baseRight") {
      tx += squash * 28;
      ty += squash * 12;
    } else if (def.id === "bottomBelly") {
      ty += squash * 18;
    } else if (def.id === "leftCheek" || def.id === "rightCheek") {
      tx += (def.id === "leftCheek" ? -1 : 1) * squash * 18;
      ty += squash * 14;
    }
  }

  if (stretch > 0) {
    if (def.id === "topCrown") {
      ty -= stretch * 28;
    } else if (def.id === "bottomBelly") {
      ty -= stretch * 16;
    } else if (def.id === "baseLeft" || def.id === "baseRight") {
      tx *= 1 + stretch * 0.06;
    } else if (def.id === "leftCheek" || def.id === "rightCheek") {
      tx *= 1 + stretch * 0.05;
      ty -= stretch * 22;
    }
  }

  // 3. Lean effect: sheared displacement & asymmetric compression
  if (Math.abs(lean) > 0.001) {
    const leanRatio = lean / 30;
    if (def.id === "topCrown") {
      tx += leanRatio * 28;
      ty += Math.abs(leanRatio) * 4;
    } else if (def.id === "leftCheek" || def.id === "rightCheek") {
      tx += leanRatio * 20;
    } else if (def.id === "baseLeft") {
      tx += leanRatio > 0 ? -leanRatio * 8 : leanRatio * 16;
    } else if (def.id === "baseRight") {
      tx += leanRatio < 0 ? -leanRatio * 8 : leanRatio * 16;
    }
  }

  // 4. Local bulges & sag
  if (def.id === "baseLeft" || def.id === "leftCheek") {
    tx -= params.leftBulge;
  }
  if (def.id === "baseRight" || def.id === "rightCheek") {
    tx += params.rightBulge;
  }
  if (def.id === "topCrown") {
    ty -= params.topBulge;
  }
  if (def.id === "bottomBelly") {
    ty += params.bottomSag;
  }

  // 5. Harmonic wobble
  if (motion.wobbleAmount > 0) {
    const wobblePhase = idleTime * 5.0 + def.breathPhase;
    const wobbleDist = Math.sin(wobblePhase) * motion.wobbleAmount * 6;
    tx += wobbleDist;
  }

  // 6. CRITICAL LOBE LAG HIERARCHY & DIRECTIONAL AIRFLOW DEFORMATION:
  // Face leads -> core maintains chunky structural presence (lag 0.05, low stretch) -> crown & cheeks follow -> rear base & belly trail along motion wake
  // Asymmetric directional lag: front leading lobes have reduced lag; rear trailing lobes drag along wake
  const isLeadingX = (characterVx > 10 && def.baseX > 8) || (characterVx < -10 && def.baseX < -8);
  const isTrailingX = (characterVx > 10 && def.baseX < -8) || (characterVx < -10 && def.baseX > 8);
  const isLeadingY = (characterVy > 10 && def.baseY > 12) || (characterVy < -10 && def.baseY < -12);
  const isTrailingY = (characterVy > 10 && def.baseY < -12) || (characterVy < -10 && def.baseY > 12);

  let directionalLagMod = 1.0;
  if (isLeadingX || isLeadingY) directionalLagMod *= 0.48;
  if (isTrailingX || isTrailingY) directionalLagMod *= 1.48;

  const lagStrength = def.lagFactor * motion.lobeLag * 0.09 * directionalLagMod;
  const maxLobeOffset = def.radiusX * 0.26;
  const rawLagX = characterVx * lagStrength;
  const rawLagY = characterVy * lagStrength;
  tx -= Math.max(-maxLobeOffset, Math.min(maxLobeOffset, rawLagX));
  ty -= Math.max(-maxLobeOffset, Math.min(maxLobeOffset, rawLagY));

  // 7. Scale computation with core shape protection and directional airflow
  const speed = Math.hypot(characterVx, characterVy);
  const nvx = speed > 1e-2 ? characterVx / speed : 0;
  const nvy = speed > 1e-2 ? characterVy / speed : 0;
  // Position projection along travel direction: positive = leading into air, negative = trailing behind
  const travelProjection = (def.baseX * nvx + def.baseY * nvy) / 75;

  let sx = breathScale * (1 + puff * 0.3);
  let sy = breathScale * (1 + puff * 0.3);

  const isCore = def.id === "core" || def.id === "frontVeil";
  // Core preserves chunky spherical volume; trailing rear lobes take on fluid elongation
  const squashFactor = isCore ? 0.22 : (def.depth < 0 ? 1.25 : 0.8);
  const stretchFactor = isCore ? 0.22 : (def.depth < 0 ? 0.5 : 0.65);

  if (sliderSquash > 0) {
    sx *= 1 + sliderSquash * 0.3 * squashFactor;
    sy *= 1 - sliderSquash * 0.24 * squashFactor;
  }
  if (sliderStretch > 0) {
    sx *= 1 - sliderStretch * 0.2 * stretchFactor;
    sy *= 1 + sliderStretch * 0.36 * stretchFactor;
  }

  // Aerodynamic motion reaction:
  // Leading lobes compress slightly from airflow resistance; trailing lobes elongate along wake
  if (speed > 25 && !isCore) {
    const airflowLag = clamp(speed / 380, 0, 0.35) * def.lagFactor;
    if (travelProjection > 0.2) {
      // Leading into airflow: compact slightly
      const comp = 1 - airflowLag * 0.45;
      sx *= comp;
      sy *= comp;
    } else if (travelProjection < -0.2) {
      // Trailing behind: stretch gently along motion vector
      sx *= 1 + Math.abs(nvx) * airflowLag * 0.55;
      sy *= 1 + Math.abs(nvy) * airflowLag * 0.65;
    }
  }

  // Local radial contact and grab squish. The dent originates at the actual
  // contact point, not as a whole-body oval: nearby mass compresses, neighbours
  // bulge, the far side keeps its volume. Same path handles walls and corners.
  const wallPress = clamp(params.contactPressure ?? 0, 0, 1);
  const grabPress = clamp(params.grabPressure ?? 0, -0.2, 1.4);

  const angle = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const wx = params.contactX ?? 0,
    wy = params.contactY ?? 0;
  const nx = wx * cos + wy * sin,
    ny = wy * cos - wx * sin;

  const contactDist = params.contactDistance ?? 999;
  const grabX = params.contactRelX ?? nx * (contactDist < 800 ? contactDist : 0);
  const grabY = params.contactRelY ?? ny * (contactDist < 800 ? contactDist : 0);
  const isCenterPress = grabPress > 0.05 && contactDist < 28;

  // Core resistance: 0.38 for tactile grab (dense soft cloud rather than solid rock)
  const grabResistance = isCore ? 0.38 : 1.0;
  const resistance = wallPress > grabPress ? (isCore ? 0.22 : 1.0) : grabResistance;

  let dentInfluence = 0;

  if (isCenterPress) {
    // Symmetrical central marshmallow pocket: finger/thumb presses into the center crown/core,
    // crown depresses, core recesses, side cheeks puff outward, belly pushes down.
    if (def.id === "topCrown") {
      ty += 8 * grabPress * resistance;
      sy *= 1 - 0.18 * grabPress * resistance;
      sx *= 1 + 0.08 * grabPress * resistance;
      dentInfluence = 0.85 * grabPress;
    } else if (def.id === "core") {
      ty += 3 * grabPress * resistance;
      sy *= 1 - 0.20 * grabPress * resistance;
      sx *= 1 - 0.08 * grabPress * resistance;
      dentInfluence = 0.85 * grabPress;
    } else if (def.id === "leftCheek") {
      tx -= 15 * grabPress * resistance;
      sx *= 1 + 0.16 * grabPress * resistance;
      sy *= 1 + 0.08 * grabPress * resistance;
    } else if (def.id === "rightCheek") {
      tx += 15 * grabPress * resistance;
      sx *= 1 + 0.16 * grabPress * resistance;
      sy *= 1 + 0.08 * grabPress * resistance;
    } else if (def.id === "bottomBelly") {
      ty += 10 * grabPress * resistance;
      sx *= 1 + 0.14 * grabPress * resistance;
      sy *= 1 + 0.06 * grabPress * resistance;
    } else if (def.id === "baseLeft") {
      tx -= 9 * grabPress * resistance;
      sx *= 1 + 0.10 * grabPress * resistance;
    } else if (def.id === "baseRight") {
      tx += 9 * grabPress * resistance;
      sx *= 1 + 0.10 * grabPress * resistance;
    }
  } else if (grabPress > 0.05) {
    // Finger-local dent: radial falloff from the actual contact point, blended
    // with side-facing so a cheek grab stays on that cheek.
    const dx = def.baseX - grabX;
    const dy = def.baseY - grabY;
    const dist = Math.hypot(dx, dy);
    const radius = params.influenceRadius ?? 58;
    const radial = gaussianFalloff(dist, radius * 0.82);
    const ring = smoothFalloff(dist, radius * 1.2) * (1 - radial);

    const projection = def.baseX * nx + def.baseY * ny;
    const tangent = -def.baseX * ny + def.baseY * nx;
    const facingContact = clamp(0.5 + projection / 110, 0, 1);
    const contactWeight = clamp(radial * 0.62 + facingContact * 0.55, 0, 1.2);

    const contactIndent = contactWeight > 0.35 ? (contactWeight - 0.35) / 0.65 : 0;
    const localDisplacement = contactIndent * 18 * grabPress * resistance;
    tx -= nx * localDisplacement;
    ty -= ny * localDisplacement;

    // Neighbouring mass (upper/lower on the same side) puffs slightly outward.
    if (ring > 0.04 && facingContact > 0.18 && facingContact < 0.88) {
      const lobeR = Math.hypot(def.baseX, def.baseY);
      if (lobeR > 1) {
        tx += (def.baseX / lobeR) * ring * 7 * grabPress * resistance;
        ty += (def.baseY / lobeR) * ring * 7 * grabPress * resistance;
        sx *= 1 + ring * 0.08 * grabPress * resistance;
        sy *= 1 + ring * 0.05 * grabPress * resistance;
      }
    }

    // Mass redistribution along tangent (crown/belly on a cheek squeeze).
    const tangentSign = tangent >= 0 ? 1 : -1;
    const tangentPush = clamp(Math.abs(tangent) / 75, 0, 1) * 8 * grabPress * resistance;
    tx += -ny * tangentSign * tangentPush;
    ty += nx * tangentSign * tangentPush;

    // Far side keeps volume; only a tiny opposite bulge so he doesn't look hollow.
    if (facingContact < 0.35 && radial < 0.22) {
      const oppositeBulge = (0.35 - facingContact) / 0.35;
      tx += nx * (oppositeBulge * 4.2 * grabPress * resistance);
      ty += ny * (oppositeBulge * 4.2 * grabPress * resistance);
    }

    // Core drifts slightly away from the finger.
    if (def.id === "core") {
      tx -= nx * 3.2 * grabPress;
      ty -= ny * 3.2 * grabPress;
    }

    const compression = (0.12 + contactWeight * 0.20) * grabPress * resistance;
    const expansion = (0.10 + (1 - facingContact) * 0.12) * grabPress * resistance;
    sx *= 1 - compression * nx * nx + expansion * ny * ny;
    sy *= 1 - compression * ny * ny + expansion * nx * nx;

    // Contact region reaches toward the pointer; far lobes stay with the lagged core.
    const pullX = params.gripPullX ?? 0;
    const pullY = params.gripPullY ?? 0;
    tx += pullX * radial;
    ty += pullY * radial;

    dentInfluence = contactWeight > 0.5 ? clamp((contactWeight - 0.5) * 2 * grabPress, 0, 1) : 0;
  } else if (wallPress > 0.005) {
    // Wall / corner contact against the round AMOLED bezel.
    const projection = def.baseX * nx + def.baseY * ny;
    const tangent = -def.baseX * ny + def.baseY * nx;
    const facingContact = clamp(0.5 + projection / 135, 0, 1);
    const cornerBlend = clamp(params.cornerBlend ?? 0, 0, 1);
    const resist = isCore ? 0.16 : 1;

    // Combined two-axis flatten: compress along the radial normal, send volume
    // into the free quadrant. Never independently pancake X then Y.
    const compression =
      wallPress * facingContact * 0.26 * (1 - cornerBlend * 0.24) * resist;
    const expansion =
      wallPress * (0.09 + (1 - facingContact) * 0.12) * (1 + cornerBlend * 0.2) * resist;

    const indentBase = 8 + facingContact * 18;
    tx -= nx * wallPress * indentBase * resist;
    ty -= ny * wallPress * indentBase * resist;
    tx -= ny * tangent * wallPress * 0.11 * resist;
    ty += nx * tangent * wallPress * 0.11 * resist;

    if (cornerBlend > 0.12) {
      const free = 1 - facingContact;
      tx -= nx * wallPress * cornerBlend * 9 * resist * free;
      ty -= ny * wallPress * cornerBlend * 9 * resist * free;
    }

    sx *= 1 - compression * nx * nx + expansion * ny * ny;
    sy *= 1 - compression * ny * ny + expansion * nx * nx;
  }

  // Travel stretch after a flick: elongate along velocity, keep area.
  const flick = params.flickStretch ?? 0;
  if (flick > 0.004) {
    const vx = params.velocityX ?? 0;
    const vy = params.velocityY ?? 0;
    const spd = Math.hypot(vx, vy);
    if (spd > 1) {
      const nvx = vx / spd;
      const nvy = vy / spd;
      const along = isCore ? 0.45 : 1;
      sx *= 1 + flick * (nvx * nvx - nvy * nvy * 0.45) * along;
      sy *= 1 + flick * (nvy * nvy - nvx * nvx * 0.45) * along;
    }
  }

  // Direction change: near side (into the yank) compresses, far side stretches.
  const ax = params.accelX ?? 0;
  const ay = params.accelY ?? 0;
  const accel = Math.hypot(ax, ay);
  if (accel > 500 && !isCore) {
    const lead = (def.baseX * ax + def.baseY * ay) / (accel * 90);
    if (lead > 0.25) {
      const k = clamp(lead, 0, 1) * 0.045;
      sx *= 1 - k;
      sy *= 1 - k * 0.7;
    } else if (lead < -0.25) {
      const k = clamp(-lead, 0, 1) * 0.035;
      sx *= 1 + k * 0.7;
      sy *= 1 + k;
    }
  }

  // Preserve character-level volume without undoing intentional contact dent.
  const restArea = breathScale * breathScale * (1 + puff * 0.3) ** 2;
  const areaCorrection = Math.sqrt(
    clamp(restArea / Math.max(0.1, sx * sy), 0.88, 1.18)
  );
  // Pressed lobe is allowed to lose local projected area; volume preservation happens across the character
  const localAreaCorrection = 1 + (areaCorrection - 1) * (1 - dentInfluence * 0.82);
  sx *= localAreaCorrection;
  sy *= localAreaCorrection;

  const shelf = def.depth < 0;
  const isGrab = grabPress > 0.05;
  const minScaleX = isCore
    ? (isGrab ? 0.78 : 0.93)
    : isGrab
      ? (shelf ? 0.72 : 0.66)
      : (shelf ? 0.90 : 0.84);
  const minScaleY = isCore
    ? (isGrab ? 0.78 : 0.93)
    : isGrab
      ? (shelf ? 0.72 : 0.66)
      : 0.82;
  sx = clamp(sx, minScaleX, 1.38);
  sy = clamp(sy, minScaleY, 1.38);

  // Authored shape is distinct from material/contact protection. Applying it
  // after the neutral-core clamp preserves its magnitude instead of silently
  // clamping a pancake back to 93% height. Each mass carries different weight.
  const actingX = params.actingScaleX ?? 1;
  const actingY = params.actingScaleY ?? 1;
  const crown = def.id === "topCrown";
  const lower = def.depth < 0 || def.id === "bottomBelly";
  const shapeWeight = crown ? 1.08 : lower ? 0.92 : 1;
  const localX = 1 + (actingX - 1) * (lower ? 1.08 : crown ? 0.92 : 1);
  const localY = 1 + (actingY - 1) * shapeWeight;
  tx *= localX;
  ty = 35 + (ty - 35) * localY;
  sx *= localX;
  sy *= localY;
  const actedPuff = params.actingPuff ?? 0;
  tx *= 1 + actedPuff * (lower ? 0.24 : 0.12);
  ty -= actedPuff * (crown ? 22 : isCore ? 6 : 0);
  if (actedPuff > 0.01) {
    if (def.id === "leftCheek") tx -= actedPuff * 18;
    else if (def.id === "rightCheek") tx += actedPuff * 18;
    else if (def.id === "baseLeft") tx -= actedPuff * 12;
    else if (def.id === "baseRight") tx += actedPuff * 12;
  }

  const rot = (lean * 0.38 * (1 - def.lagFactor * 0.45) * Math.PI) / 180;

  let opacity = def.baseOpacity * (1 - puff * 0.12);
  if (def.id === "frontVeil") {
    opacity =
      def.baseOpacity *
      (params.faceEmbedDepth / 0.14) *
      (1 - clamp(grabPress, 0, 1) * 0.55);
  }

  out.targetX = tx;
  out.targetY = ty;
  out.targetScaleX = sx;
  out.targetScaleY = sy;
  out.targetOpacity = opacity;
  out.targetRotation = rot;
  return out;
}

const target = {
  targetX: 0,
  targetY: 0,
  targetScaleX: 1,
  targetScaleY: 1,
  targetOpacity: 1,
  targetRotation: 0,
};

export function stepLobePhysics(
  lobeStates: Record<string, LobeState>,
  params: CloudDeformationParams,
  motion: CloudMotionConfig,
  characterVx: number,
  characterVy: number,
  idleTime: number,
  dt: number,
): void {
  const clampedDt = Math.max(0, Math.min(dt, 0.05));
  const steps = Math.max(1, Math.ceil(clampedDt * 120));
  const h = clampedDt / steps;

  for (const def of LOBE_DEFINITIONS) {
    const state = lobeStates[def.id];
    if (!state) continue;

    const {
      targetX,
      targetY,
      targetScaleX,
      targetScaleY,
      targetOpacity,
      targetRotation,
    } = computeLobeTarget(
      def,
      params,
      motion,
      characterVx,
      characterVy,
      idleTime,
      target,
    );

    const stiffness = def.stiffness * (motion.springStiffness / 145);
    // Minimum damping ratio gives one small follow-through, then quiet.
    const damping = Math.max(def.damping * (motion.springDamping / 14.5),
      2 * Math.sqrt(stiffness) * (def.depth < 0 ? 0.78 : 0.86));

    for (let i = 0; i < steps; i++) {
      // X axis spring
      const fx = -stiffness * (state.x - targetX) - damping * state.vx;
      state.vx += fx * h;
      state.x += state.vx * h;

      // Y axis spring
      const fy = -stiffness * (state.y - targetY) - damping * state.vy;
      state.vy += fy * h;
      state.y += state.vy * h;
    }
    // Per-lobe recovery: core is snappy, crown a little springy, rear shelf last.
    const scaleHz =
      def.id === "core"
        ? 26
        : def.id === "topCrown"
          ? 15
          : def.depth < 0
            ? 10
            : 19;
    const rate = 1 - Math.exp(-scaleHz * clampedDt);
    state.scaleX += (targetScaleX - state.scaleX) * rate;
    state.scaleY += (targetScaleY - state.scaleY) * rate;
    state.opacity += (targetOpacity - state.opacity) * rate;
    state.rotation += (targetRotation - state.rotation) * rate;
  }

  // Cohesive Volume Tethering:
  // A cloud is a single connected fluid/vapor volume. Peripheral lobes must NEVER disconnect from the core.
  const coreState = lobeStates.core;
  if (coreState) {
    for (const def of LOBE_DEFINITIONS) {
      if (def.id === "core" || def.id === "frontVeil") continue;
      const s = lobeStates[def.id];
      if (!s) continue;

      const maxDistX = (Math.abs(def.baseX) + def.radiusX * 0.28) * Math.max(1, params.actingScaleX ?? 1);
      const maxDistY = (Math.abs(def.baseY) + def.radiusY * 0.28) * Math.max(1, params.actingScaleY ?? 1);

      const dx = s.x - coreState.x;
      const dy = s.y - coreState.y;

      if (Math.abs(dx) > maxDistX) {
        s.x = coreState.x + Math.sign(dx) * (maxDistX + (Math.abs(dx) - maxDistX) * 0.15);
        s.vx *= 0.6;
      }
      if (Math.abs(dy) > maxDistY) {
        s.y = coreState.y + Math.sign(dy) * (maxDistY + (Math.abs(dy) - maxDistY) * 0.15);
        s.vy *= 0.6;
      }
    }
  }
}

export const PRESETS: Record<
  CloudPresetName,
  Partial<CloudDeformationParams>
> = {
  NEUTRAL: {
    scale: 1,
    scaleX: 1,
    scaleY: 1,
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
    coreDensity: 1.15,
    lobeSoftness: 1.0,
    gazeX: 0,
    gazeY: 0,
  },
  PUFF: {
    puff: 0.65,
    squash: 0,
    stretch: 0,
    lean: 0,
    scale: 1.1,
    coreDensity: 0.9,
    lobeSoftness: 1.3,
  },
  SQUASH: {
    squash: 0.8,
    stretch: 0,
    lean: 0,
    puff: 0.08,
    bottomSag: 18,
    leftBulge: 20,
    rightBulge: 20,
    topBulge: -16,
    y: 8,
  },
  STRETCH: {
    stretch: 0.85,
    squash: 0,
    lean: 0,
    puff: -0.08,
    topBulge: 26,
    leftBulge: -14,
    rightBulge: -14,
    bottomSag: -10,
    y: -14,
  },
  "LEAN LEFT": {
    lean: -28,
    squash: 0.15,
    stretch: 0,
    leftBulge: 14,
    rightBulge: -8,
    rotation: -4,
    x: -12,
    gazeX: -0.6,
  },
  "LEAN RIGHT": {
    lean: 28,
    squash: 0.15,
    stretch: 0,
    rightBulge: 14,
    leftBulge: -8,
    rotation: 4,
    x: 12,
    gazeX: 0.6,
  },
  "SOFT WOBBLE": {
    squash: 0.2,
    stretch: 0,
    lean: 8,
    puff: 0.15,
  },
  "DRIFT LEFT": {
    x: -36,
    lean: -18,
    scaleX: 1.05,
    scaleY: 0.95,
    gazeX: -0.8,
  },
  "DRIFT RIGHT": {
    x: 36,
    lean: 18,
    scaleX: 1.05,
    scaleY: 0.95,
    gazeX: 0.8,
  },
  "MIST TRAIL": {
    lean: 22,
    puff: 0.35,
    squash: 0.2,
    x: 24,
    gazeX: 0.5,
  },
  SETTLE: {
    squash: 0.9,
    bottomSag: 22,
    leftBulge: 24,
    rightBulge: 24,
    topBulge: -18,
    y: 12,
    gazeY: 0.3,
  },
  "SLEEPY FLATTEN": {
    squash: 0.55,
    scaleY: 0.82,
    scaleX: 1.15,
    bottomSag: 14,
    puff: -0.15,
    coreDensity: 1.0,
    y: 16,
    gazeY: 0.5,
  },
  "EXCITED PUFF": {
    puff: 0.75,
    stretch: 0.3,
    topBulge: 18,
    scale: 1.18,
    y: -18,
    coreDensity: 1.25,
    gazeY: -0.3,
  },
};
