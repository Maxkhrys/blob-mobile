/**
 * Canonical Environment Presets
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/environmentConfig.ts
 */

import { EnvironmentPreset } from "./types";

export const CANONICAL_ENVIRONMENTS: EnvironmentPreset[] = [
  {
    id: "scenic",
    label: "Background A",
    displayMode: "dark",
    screenColour: "#000000",
    description:
      "Sunset lake & alpine mountain landscape with golden hour atmosphere.",
    bgColor: "#090C15",
    surfaceColor: "#151B2B",
    accentColor: "#60A5FA",
    textColor: "#FFFFFF",
    badge: "Alpine Lake",
  },
  {
    id: "scenic-b",
    label: "Background B",
    displayMode: "dark",
    screenColour: "#000000",
    description:
      "Golden hour sunset over coastal rocks and serene mountain water.",
    bgColor: "#0A0D18",
    surfaceColor: "#171F33",
    accentColor: "#F59E0B",
    textColor: "#FFFFFF",
    badge: "Rocky Shore",
  },
  {
    id: "zen",
    label: "Warm Sand",
    displayMode: "warm",
    screenColour: "#cfc3b4",
    description:
      "Calm sand and warm stone ambience. Soft, grounded natural light.",
    bgColor: "#15120E",
    surfaceColor: "#2A2118",
    accentColor: "#8C7862",
    textColor: "#F5F3EF",
    badge: "Sand",
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
    bgColor: "#26160C",
    surfaceColor: "#3B2214",
    accentColor: "#D97706",
    textColor: "#FDE68A",
    badge: "Cabin Dusk",
  },
];

export const DEFAULT_ENVIRONMENT = CANONICAL_ENVIRONMENTS[0]; // Scenic Sunset (Background A)

export function getEnvironmentById(id: string): EnvironmentPreset {
  const norm = (id || "").toLowerCase();
  return (
    CANONICAL_ENVIRONMENTS.find(
      (e) =>
        e.id === norm ||
        ((norm === "bg-a" || norm === "photo" || norm === "lake") && e.id === "scenic") ||
        ((norm === "bg-b" || norm === "shore" || norm === "rocky") && e.id === "scenic-b") ||
        ((norm === "sand" || norm === "warm-stone") && e.id === "zen") ||
        ((norm === "amoled" || norm === "sky") && e.id === "dark") ||
        (norm === "warm-glow" && e.id === "warm"),
    ) || DEFAULT_ENVIRONMENT
  );
}
