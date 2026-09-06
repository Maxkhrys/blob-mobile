import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../constants/theme";

const ATMOSPHERIC_BG_IMAGE = require("../../../assets/images/atmospheric-bg.jpg");

export type AtmosphericVariant = "home" | "calm" | "bright";

interface AtmosphericBackgroundProps {
  children?: React.ReactNode;
  variant?: AtmosphericVariant;
  style?: StyleProp<ViewStyle>;
}

export function AtmosphericBackground({
  children,
  variant = "home",
  style,
}: AtmosphericBackgroundProps) {
  const theme = useTheme();
  const isLight = theme.mode === "light";

  if (isLight) {
    const lightScrimColors =
      variant === "home"
        ? (["rgba(255, 255, 255, 0.45)", "rgba(240, 244, 255, 0.25)", "rgba(220, 230, 248, 0.65)"] as const)
        : (["rgba(255, 255, 255, 0.72)", "rgba(240, 244, 255, 0.65)", "rgba(220, 230, 248, 0.82)"] as const);

    return (
      <View style={[styles.container, style]}>
        <Image
          source={ATMOSPHERIC_BG_IMAGE}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <LinearGradient
          colors={lightScrimColors}
          locations={variant === "home" ? [0, 0.45, 1] : undefined}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  // Dark / Primary Reference Atmospheric Wallpaper
  const darkScrimColors =
    variant === "home"
      ? ([
          "rgba(8, 12, 22, 0.42)",  // Top starry sky: soft contrast for header & motto
          "rgba(10, 14, 25, 0.12)", // Middle: lets the golden sunset, mountains & lake glow vividly
          "rgba(8, 11, 20, 0.38)",  // Lower: soft depth for circular buttons & narrative
          "rgba(6, 8, 16, 0.72)",   // Bottom: ground vignette for the floating glass dock
        ] as const)
      : variant === "calm"
        ? ([
            "rgba(8, 11, 20, 0.72)",
            "rgba(10, 14, 25, 0.62)",
            "rgba(6, 8, 15, 0.86)",
          ] as const)
        : ([
            "rgba(10, 14, 26, 0.50)",
            "rgba(14, 18, 32, 0.35)",
            "rgba(8, 11, 20, 0.72)",
          ] as const);

  return (
    <View style={[styles.container, style]}>
      {/* 1. High-Resolution Atmospheric Sunset Vista Wallpaper */}
      <Image
        source={ATMOSPHERIC_BG_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* 2. Tuned Glass Scrim Gradient for pristine readability and dock elevation */}
      <LinearGradient
        colors={darkScrimColors}
        locations={variant === "home" ? [0, 0.35, 0.68, 1] : undefined}
        style={StyleSheet.absoluteFill}
      />

      {/* 3. Subtle ambient light reinforcement for Home */}
      {variant === "home" && (
        <View pointerEvents="none" style={styles.ambientBottomGlow} />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090C15",
  },
  ambientBottomGlow: {
    position: "absolute",
    bottom: "8%",
    left: "15%",
    right: "15%",
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(56, 139, 255, 0.04)",
  },
});
