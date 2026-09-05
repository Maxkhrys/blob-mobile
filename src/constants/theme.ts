import { useColorScheme, Platform } from "react-native";
import { useAppStore } from "../store/AppContext";

export const Colors = {
  light: {
    background: "#F4F2F1",
    backgroundSecondary: "#EDE9E7",
    surface: "#FCFAF9",
    surfaceElevated: "#FCFAF9",
    border: "#E9ECEF",
    borderSubtle: "#EDE9E7",
    text: "#252322",
    textSecondary: "#716A67",
    textTertiary: "#79716D",
    primary: "#292423",
    primaryContrast: "#FCFAF9",
    accent: "#854338",
    accentMuted: "#EBDDD8",
    success: "#10B981",
    successMuted: "#D1FAE5",
    warning: "#F59E0B",
    warningMuted: "#FEF3C7",
    danger: "#EF4444",
    dangerMuted: "#FEE2E2",
    cardShadow: "rgba(0, 0, 0, 0.04)",
    deviceConnected: "#10B981",
    deviceDisconnected: "#EF4444",
    deviceReconnecting: "#F59E0B",
  },
  dark: {
    background: "#161514",
    backgroundSecondary: "#1C1A19",
    surface: "#24211F",
    surfaceElevated: "#302B28",
    border: "#403A36",
    borderSubtle: "#302B28",
    text: "#F4EFEB",
    textSecondary: "#B8AEA8",
    textTertiary: "#A99E97",
    primary: "#F4EFEB",
    primaryContrast: "#161514",
    accent: "#E3ADA0",
    accentMuted: "#49312B",
    success: "#34D399",
    successMuted: "#064E3B",
    warning: "#FBBF24",
    warningMuted: "#78350F",
    danger: "#F87171",
    dangerMuted: "#7F1D1D",
    cardShadow: "rgba(0, 0, 0, 0.4)",
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
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
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
  return { ...Colors[mode || "light"], mode: mode || "light" };
}
