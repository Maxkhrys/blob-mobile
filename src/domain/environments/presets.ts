/**
 * Canonical Environment Presets
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/environmentConfig.ts
 */

import { EnvironmentPreset } from "./types";

export const CANONICAL_ENVIRONMENTS: EnvironmentPreset[] = [
  {
    id: "scenic",
    label: "Scenic Sunset",
    displayMode: "dark",
    screenColour: "#000000",
    description:
      "Sunset lake & alpine mountain landscape with golden hour atmosphere.",
    bgColor: "#090C15",
    surfaceColor: "#151B2B",
    accentColor: "#60A5FA",
    textColor: "#FFFFFF",
    badge: "Scenic Photo",
  },
  {
    id: "zen",
    label: "Warm Sand",
    displayMode: "warm",
    screenColour: "#cfc3b4",
    description:
      "Calm sand and warm stone ambience. Soft, grounded natural light.",
    bgColor: "#F5F3EF",
    surfaceColor: "#FFFFFF",
    accentColor: "#8C7862",
    textColor: "#38322B",
    badge: "Warm Sand",
  },
  {
    id: "dark",
    label: "AMOLED Dark",
    displayMode: "dark",
    screenColour: "#000000",
    description:
      "Stealth contrast optimized for cabin AMOLED black depth. Pure dark void.",
    bgColor: "#05070B",
    surfaceColor: "#0D111A",
    accentColor: "#388BFF",
    textColor: "#F3F4F6",
    badge: "AMOLED",
  },
  {
    id: "warm",
    label: "Cabin Dusk",
    displayMode: "brown",
    screenColour: "#a58d76",
    description:
      "Subtle golden cabin warmth and dusk ember tones. Cozy night drive feel.",
    bgColor: "#FFF8F0",
    surfaceColor: "#FFFFFF",
    accentColor: "#D97706",
    textColor: "#451A03",
    badge: "Cabin Dusk",
  },
];

export const DEFAULT_ENVIRONMENT = CANONICAL_ENVIRONMENTS[0]; // Scenic Sunset

export function getEnvironmentById(id: string): EnvironmentPreset {
  const norm = (id || "").toLowerCase();
  return (
    CANONICAL_ENVIRONMENTS.find(
      (e) =>
        e.id === norm ||
        (norm === "photo" && e.id === "scenic") ||
        (norm === "sand" && e.id === "zen") ||
        (norm === "warm-stone" && e.id === "zen") ||
        (norm === "amoled" && e.id === "dark") ||
        (norm === "warm-glow" && e.id === "warm") ||
        (norm === "sky" && e.id === "dark"),
    ) || DEFAULT_ENVIRONMENT
  );
}
