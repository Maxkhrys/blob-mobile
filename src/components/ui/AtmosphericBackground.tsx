import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../constants/theme";

const BACKGROUND_A = require("../../../assets/images/background-a.jpg");
const BACKGROUND_B = require("../../../assets/images/background-b.jpg");

export type AtmosphericVariant = "home" | "calm" | "bright";

export interface AtmosphericBackgroundProps {
  children?: React.ReactNode;
  variant?: AtmosphericVariant;
  environment?: string;
  style?: StyleProp<ViewStyle>;
}

export function AtmosphericBackground({
  children,
  variant = "home",
  environment,
  style,
}: AtmosphericBackgroundProps) {
  const theme = useTheme();
  const isLight = theme.mode === "light";
  const envNorm = (environment || "scenic").toLowerCase();

  const isBgB =
    envNorm === "scenic-b" ||
    envNorm === "bg-b" ||
    envNorm === "shore" ||
    envNorm === "rocky";
  const isSand =
    envNorm === "zen" ||
    envNorm === "sand" ||
    envNorm === "warm-stone";
  const isDark =
    envNorm === "dark" ||
    envNorm === "amoled" ||
    envNorm === "sky";
  const isWarm =
    envNorm === "warm" ||
    envNorm === "warm-glow";

  const scenicSource = isBgB ? BACKGROUND_B : BACKGROUND_A;

  if (isLight) {
    const lightScrimColors =
      variant === "home"
        ? (["rgba(255, 255, 255, 0.45)", "rgba(240, 244, 255, 0.25)", "rgba(220, 230, 248, 0.65)"] as const)
        : (["rgba(255, 255, 255, 0.72)", "rgba(240, 244, 255, 0.65)", "rgba(220, 230, 248, 0.82)"] as const);

    return (
      <View style={[styles.container, style]}>
        <ExpoImage
          source={scenicSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
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

  // 1. Warm Sand / Zen Environment (similar to LCDPROTO static scene)
  if (isSand) {
    return (
      <View style={[styles.container, { backgroundColor: "#15120E" }, style]}>
        <LinearGradient
          colors={["#2C2219", "#18130E", "#0C0907"]}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Soft atmospheric sand illumination */}
        <View pointerEvents="none" style={styles.sandGlow} />
        {/* Zen garden ripple accents at floor */}
        <View pointerEvents="none" style={styles.zenRipplesContainer}>
          <View style={[styles.zenRipple, { width: 340, height: 52, opacity: 0.18 }]} />
          <View style={[styles.zenRipple, { width: 300, height: 46, opacity: 0.24 }]} />
          <View style={[styles.zenRipple, { width: 250, height: 38, opacity: 0.30 }]} />
        </View>
        {children}
      </View>
    );
  }

  // 2. Pure AMOLED Dark Environment
  if (isDark) {
    return (
      <View style={[styles.container, { backgroundColor: "#000000" }, style]}>
        <LinearGradient
          colors={["#0A0D15", "#040508", "#000000"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle deep starlight motes */}
        <View pointerEvents="none" style={styles.starMote1} />
        <View pointerEvents="none" style={styles.starMote2} />
        <View pointerEvents="none" style={styles.starMote3} />
        {children}
      </View>
    );
  }

  // 3. Cabin Dusk Warm Ember Environment
  if (isWarm) {
    return (
      <View style={[styles.container, { backgroundColor: "#0C0704" }, style]}>
        <LinearGradient
          colors={["#26160C", "#170D07", "#080402"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.warmEmberGlow} />
        {children}
      </View>
    );
  }

  // 4. Default: High-Resolution Atmospheric Sunset Vista Wallpaper
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
      <ExpoImage
        source={scenicSource}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
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
  sandGlow: {
    position: "absolute",
    top: "22%",
    alignSelf: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(221, 203, 181, 0.12)",
  },
  zenRipplesContainer: {
    position: "absolute",
    bottom: "12%",
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
  },
  zenRipple: {
    borderWidth: 1.2,
    borderColor: "#B99B7A",
    borderRadius: 999,
  },
  starMote1: {
    position: "absolute",
    top: "14%",
    left: "22%",
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  starMote2: {
    position: "absolute",
    top: "26%",
    right: "18%",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(200, 225, 255, 0.65)",
  },
  starMote3: {
    position: "absolute",
    top: "38%",
    left: "14%",
    width: 1.5,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  warmEmberGlow: {
    position: "absolute",
    top: "26%",
    alignSelf: "center",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
  },
});
