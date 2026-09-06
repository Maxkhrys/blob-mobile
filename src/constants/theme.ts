import { useColorScheme, Platform } from "react-native";
import { useAppStore } from "../store/AppContext";

export const Colors = {
  light: {
    background: "#DCE3EE",
    backgroundSecondary: "#CDD6E4",
    surface: "rgba(255, 255, 255, 0.62)",
    surfaceElevated: "rgba(255, 255, 255, 0.78)",
    border: "rgba(255, 255, 255, 0.45)",
    borderSubtle: "rgba(255, 255, 255, 0.28)",
    text: "#0F1523",
    textSecondary: "rgba(15, 21, 35, 0.68)",
    textTertiary: "rgba(15, 21, 35, 0.42)",
    primary: "#0F1523",
    primaryContrast: "#FFFFFF",
    accent: "#388BFF",
    accentMuted: "rgba(56, 139, 255, 0.16)",
    accentGlow: "rgba(56, 139, 255, 0.35)",
    electricBlue: "#388BFF",
    electricHalo: "rgba(56, 139, 255, 0.45)",
    sunsetPeach: "#E8A598",
    periwinkle: "#8E9EC6",
    glass: "rgba(255, 255, 255, 0.55)",
    glassElevated: "rgba(255, 255, 255, 0.72)",
    glassStrong: "rgba(255, 255, 255, 0.88)",
    glassBorder: "rgba(255, 255, 255, 0.45)",
    glassBorderHighlight: "rgba(255, 255, 255, 0.75)",
    glassBorderSubtle: "rgba(255, 255, 255, 0.25)",
    glassHighlight: "rgba(255, 255, 255, 0.35)",
    success: "#10B981",
    successMuted: "#D1FAE5",
    warning: "#F59E0B",
    warningMuted: "#FEF3C7",
    danger: "#EF4444",
    dangerMuted: "#FEE2E2",
    cardShadow: "rgba(15, 21, 35, 0.08)",
    deviceConnected: "#10B981",
    deviceDisconnected: "#EF4444",
    deviceReconnecting: "#F59E0B",
  },
  dark: {
    background: "#090C15",
    backgroundSecondary: "#0F1424",
    surface: "rgba(18, 25, 42, 0.62)",
    surfaceElevated: "rgba(26, 35, 58, 0.72)",
    border: "rgba(255, 255, 255, 0.14)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    text: "#F0F4FC",
    textSecondary: "rgba(240, 244, 252, 0.68)",
    textTertiary: "rgba(240, 244, 252, 0.42)",
    primary: "#F0F4FC",
    primaryContrast: "#090C15",
    accent: "#388BFF",
    accentMuted: "rgba(56, 139, 255, 0.18)",
    accentGlow: "rgba(56, 139, 255, 0.42)",
    electricBlue: "#388BFF",
    electricHalo: "rgba(56, 139, 255, 0.48)",
    sunsetPeach: "#E8A598",
    periwinkle: "#8E9EC6",
    glass: "rgba(18, 25, 42, 0.58)",
    glassElevated: "rgba(26, 35, 58, 0.72)",
    glassStrong: "rgba(34, 46, 75, 0.85)",
    glassBorder: "rgba(255, 255, 255, 0.16)",
    glassBorderHighlight: "rgba(255, 255, 255, 0.35)",
    glassBorderSubtle: "rgba(255, 255, 255, 0.09)",
    glassHighlight: "rgba(255, 255, 255, 0.14)",
    success: "#34D399",
    successMuted: "#064E3B",
    warning: "#FBBF24",
    warningMuted: "#78350F",
    danger: "#F87171",
    dangerMuted: "#7F1D1D",
    cardShadow: "rgba(0, 0, 0, 0.45)",
    deviceConnected: "#34D399",
    deviceDisconnected: "#F87171",
    deviceReconnecting: "#FBBF24",
  },
} as const;

export type ThemeMode = "light" | "dark";

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 9999,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  fontFamily: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "sans-serif",
  }),
  hero: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  title2: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  callout: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  subhead: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
};

export function useTheme() {
  const { profile } = useAppStore();
  const system = useColorScheme();
  const mode =
    profile.themeMode === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : profile.themeMode;
  return { ...Colors[mode || "dark"], mode: mode || "dark" };
}
