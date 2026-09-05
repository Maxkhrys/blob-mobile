/**
 * Canonical Cloud Palettes & Presets
 * Synchronized with LCDPROTO: lib/cloudPresets.ts & components/experimental/cloud-blob/cloudLobeSystem.ts
 */

import { CloudColourPreset } from "./types";

export const CANONICAL_CLOUD_PRESETS: CloudColourPreset[] = [
  {
    id: "cloud-white",
    name: "Cloud White",
    label: "White",
    builtIn: true,
    colour: {
      body: "#f2f6fb",
      innerGlow: "#c8d6ea",
      edge: "#ffffff",
      coreTint: "#93a4bd",
      glowIntensity: 0.82,
      density: 0.92,
      translucency: 0.88,
    },
    previewSwatch: "#F8FAFC",
    previewBorder: "#CBD5E1",
    accent: "#64748B",
    textColor: "#1E293B",
  },
  {
    id: "cloud-blue",
    name: "Cloud Blue",
    label: "Blue",
    builtIn: true,
    colour: {
      body: "#cfe4ff",
      innerGlow: "#4d92f5",
      edge: "#f0f7ff",
      coreTint: "#3d6598",
      glowIntensity: 1.04,
      density: 0.94,
      translucency: 0.84,
    },
    previewSwatch: "#BAE6FD",
    previewBorder: "#7DD3FC",
    accent: "#0284C7",
    textColor: "#0369A1",
  },
  {
    id: "cool-mist",
    name: "Cool Mist",
    label: "Mist / Teal",
    builtIn: true,
    colour: {
      body: "#d8e6ff",
      innerGlow: "#7b94ff",
      edge: "#eaf3ff",
      coreTint: "#627cb5",
      glowIntensity: 1.0,
      density: 0.95,
      translucency: 0.82,
    },
    previewSwatch: "#C7D2FE",
    previewBorder: "#818CF8",
    accent: "#4F46E5",
    textColor: "#3730A3",
  },
  {
    id: "purple-void",
    name: "Purple Void",
    label: "Lavender",
    builtIn: true,
    colour: {
      body: "#c4a5ff",
      innerGlow: "#8d42ff",
      edge: "#f0e6ff",
      coreTint: "#542c8e",
      glowIntensity: 1.15,
      density: 0.98,
      translucency: 0.8,
    },
    previewSwatch: "#E9D5FF",
    previewBorder: "#C084FC",
    accent: "#9333EA",
    textColor: "#7E22CE",
  },
  {
    id: "emerald-vapor",
    name: "Emerald Vapor",
    label: "Mint",
    builtIn: true,
    colour: {
      body: "#baf5db",
      innerGlow: "#18b584",
      edge: "#e8fff5",
      coreTint: "#227056",
      glowIntensity: 1.0,
      density: 0.94,
      translucency: 0.82,
    },
    previewSwatch: "#BBF7D0",
    previewBorder: "#4ADE80",
    accent: "#16A34A",
    textColor: "#15803D",
  },
  {
    id: "blush-rose",
    name: "Blush Rose",
    label: "Pink",
    builtIn: true,
    colour: {
      body: "#ffd0e2",
      innerGlow: "#f54897",
      edge: "#fff2f7",
      coreTint: "#9c3866",
      glowIntensity: 1.1,
      density: 0.94,
      translucency: 0.82,
    },
    previewSwatch: "#FBCFE8",
    previewBorder: "#F472B6",
    accent: "#DB2777",
    textColor: "#BE185D",
  },
  {
    id: "golden-dawn",
    name: "Golden Dawn",
    label: "Peach",
    builtIn: true,
    colour: {
      body: "#ffe5b8",
      innerGlow: "#f58814",
      edge: "#fffbe8",
      coreTint: "#94581e",
      glowIntensity: 1.1,
      density: 0.95,
      translucency: 0.82,
    },
    previewSwatch: "#FED7AA",
    previewBorder: "#FB923C",
    accent: "#EA580C",
    textColor: "#C2410C",
  },
  {
    id: "baby-blue",
    name: "Baby Blue",
    label: "Baby blue",
    builtIn: true,
    colour: {
      body: "#bce8ff",
      innerGlow: "#36a3f7",
      edge: "#eaf6ff",
      coreTint: "#3b6d9e",
      glowIntensity: 1.05,
      density: 0.92,
      translucency: 0.85,
    },
    previewSwatch: "#bce8ff",
    previewBorder: "#3b6d9e",
    accent: "#36a3f7",
    textColor: "#3b6d9e",
  },
];

export const DEFAULT_CLOUD_PRESET = CANONICAL_CLOUD_PRESETS[1]; // Cloud Blue

export function getCloudPresetById(id: string): CloudColourPreset {
  const norm = (id || "").toLowerCase();
  if (norm === "white" || norm === "cloud-white")
    return CANONICAL_CLOUD_PRESETS[0];
  if (norm === "blue" || norm === "cloud-blue")
    return CANONICAL_CLOUD_PRESETS[1];
  if (norm === "mint") return CANONICAL_CLOUD_PRESETS[4]; // Emerald Vapor / Mint
  if (norm === "lavender") return CANONICAL_CLOUD_PRESETS[3]; // Purple Void
  if (norm === "pink") return CANONICAL_CLOUD_PRESETS[5]; // Blush Rose
  if (norm === "peach") return CANONICAL_CLOUD_PRESETS[6]; // Golden Dawn

  return (
    CANONICAL_CLOUD_PRESETS.find(
      (p) => p.id === id || p.name.toLowerCase() === norm,
    ) || DEFAULT_CLOUD_PRESET
  );
}

export const getCloudColourPreset = getCloudPresetById;
