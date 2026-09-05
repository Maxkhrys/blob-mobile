/**
 * Canonical Cloud Character Sliders & Developer Lab Configuration
 * Synchronized with LCDPROTO: lib/characters.ts
 */

export interface CloudSliderDef {
  group: "params" | "motion" | "trails" | "colour" | "face";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
}

export const CLOUD_SLIDER_GROUPS = [
  { id: "params", label: "Body & Lobes" },
  { id: "colour", label: "Light & Optical" },
  { id: "motion", label: "Physics & Motion" },
  { id: "trails", label: "Mist & Trails" },
  { id: "face", label: "Face Placement" },
] as const;

export const CLOUD_SLIDERS: readonly CloudSliderDef[] = [
  { group: "params", key: "scale", label: "Cloud size", min: 0.5, max: 1.5, step: 0.02, fallback: 1 },
  { group: "params", key: "puff", label: "Puff", min: -0.2, max: 0.8, step: 0.02, fallback: 0 },
  { group: "params", key: "squash", label: "Squash", min: 0, max: 0.8, step: 0.02, fallback: 0 },
  { group: "params", key: "stretch", label: "Stretch", min: 0, max: 0.8, step: 0.02, fallback: 0 },
  { group: "params", key: "lean", label: "Lean", min: -30, max: 30, step: 1, fallback: 0 },
  { group: "params", key: "coreDensity", label: "Core density", min: 0.7, max: 1.4, step: 0.02, fallback: 1 },
  { group: "params", key: "lobeSoftness", label: "Outer softness", min: 0.75, max: 1.3, step: 0.02, fallback: 1 },
  { group: "params", key: "fluffiness", label: "Fluffiness / billows", min: 0, max: 1.2, step: 0.02, fallback: 1.05 },
  { group: "params", key: "lightAngle", label: "Light angle", min: -180, max: 180, step: 5, fallback: -50 },
  { group: "params", key: "lightStrength", label: "Light strength", min: 0, max: 1, step: 0.02, fallback: 0.5 },
  { group: "params", key: "cheekBlush", label: "Cheek blush", min: 0, max: 1, step: 0.02, fallback: 0 },
  { group: "params", key: "faceEmbedDepth", label: "Face embed", min: 0, max: 0.35, step: 0.01, fallback: 0.12 },
  { group: "params", key: "leftBulge", label: "Left bulge", min: -1, max: 1, step: 0.02, fallback: 0 },
  { group: "params", key: "rightBulge", label: "Right bulge", min: -1, max: 1, step: 0.02, fallback: 0 },
  { group: "params", key: "topBulge", label: "Top bulge", min: -1, max: 1, step: 0.02, fallback: 0 },
  { group: "params", key: "bottomSag", label: "Bottom sag", min: -1, max: 1, step: 0.02, fallback: 0 },

  { group: "motion", key: "floatAmount", label: "Float", min: 0, max: 10, step: 0.5, fallback: 4 },
  { group: "motion", key: "driftAmount", label: "Drift", min: 0, max: 10, step: 0.5, fallback: 2 },
  { group: "motion", key: "lobeLag", label: "Lobe lag", min: 0, max: 2, step: 0.02, fallback: 1 },
  { group: "motion", key: "springStiffness", label: "Stiffness", min: 50, max: 300, step: 5, fallback: 140 },
  { group: "motion", key: "springDamping", label: "Damping", min: 8, max: 30, step: 0.5, fallback: 14 },

  { group: "trails", key: "trailStrength", label: "Mist strength", min: 0, max: 1.4, step: 0.02, fallback: 0.6 },
  { group: "trails", key: "lifetime", label: "Mist life (s)", min: 0.4, max: 1.3, step: 0.05, fallback: 0.9 },
  { group: "trails", key: "spawnRate", label: "Emission rate", min: 0, max: 2, step: 0.05, fallback: 1 },
  { group: "trails", key: "fadeSpeed", label: "Fade speed", min: 0.5, max: 2, step: 0.05, fallback: 1 },
  { group: "trails", key: "driftAmount", label: "Mist drift", min: 0, max: 2, step: 0.05, fallback: 1 },

  { group: "colour", key: "glowIntensity", label: "Glow", min: 0, max: 2, step: 0.02, fallback: 0.8 },
  { group: "colour", key: "density", label: "Density", min: 0.5, max: 1.5, step: 0.02, fallback: 0.95 },
  { group: "colour", key: "translucency", label: "Translucency", min: 0, max: 1, step: 0.02, fallback: 0.82 },

  { group: "face", key: "offsetX", label: "Face X", min: -40, max: 40, step: 1, fallback: 0 },
  { group: "face", key: "offsetY", label: "Face Y", min: -40, max: 40, step: 1, fallback: 0 },
  { group: "face", key: "scale", label: "Face scale", min: 0.7, max: 1.4, step: 0.01, fallback: 1 },
];

export interface CloudSettingsValues {
  params: Record<string, number>;
  motion: Record<string, number>;
  trails: Record<string, number>;
  colour: Record<string, number>;
  face: {
    offsetX: number;
    offsetY: number;
    scale: number;
  };
}

export function getDefaultCloudSettings(): CloudSettingsValues {
  const settings: CloudSettingsValues = {
    params: {},
    motion: {},
    trails: {},
    colour: {},
    face: { offsetX: 0, offsetY: 0, scale: 1 },
  };
  for (const s of CLOUD_SLIDERS) {
    if (s.group === "face") {
      (settings.face as any)[s.key] = s.fallback;
    } else {
      settings[s.group][s.key] = s.fallback;
    }
  }
  return settings;
}
