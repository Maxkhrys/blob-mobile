import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../constants/theme";

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
    const lightColors =
      variant === "home"
        ? (["#C5D2E8", "#D9DFEC", "#EAD5D0", "#CCD5E4", "#B8C4D6"] as const)
        : variant === "bright"
          ? (["#D4E0F5", "#E4EBF7", "#F5E4E0", "#D8E1EE"] as const)
          : (["#CBD7EB", "#DCE3EE", "#E2D9DB", "#CCD5E4"] as const);

    return (
      <View style={[styles.container, style]}>
        <LinearGradient
          colors={lightColors}
          locations={variant === "home" ? [0, 0.28, 0.52, 0.76, 1] : undefined}
          style={StyleSheet.absoluteFill}
        />
        {/* Soft Sun/Horizon peach bloom for Home */}
        {variant === "home" && (
          <View pointerEvents="none" style={styles.lightSunBloom} />
        )}
        {children}
      </View>
    );
  }

  // Dark / Primary Reference Atmospheric Gradient
  const darkColors =
    variant === "home"
      ? (["#12182B", "#182038", "#382936", "#2B2030", "#0D111D", "#080B13"] as const)
      : variant === "bright"
        ? (["#1C2542", "#263259", "#442E3D", "#161D31", "#0B0E18"] as const)
        : (["#0F1424", "#141B30", "#1E1A29", "#101423", "#080B14"] as const);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={darkColors}
        locations={variant === "home" ? [0, 0.22, 0.44, 0.58, 0.82, 1] : undefined}
        style={StyleSheet.absoluteFill}
      />
      {/* Cinematic sunset peach / horizon bloom on the upper right as seen in reference */}
      {variant === "home" && (
        <>
          <View pointerEvents="none" style={styles.sunsetBloomCore} />
          <View pointerEvents="none" style={styles.sunsetBloomHalo} />
          <View pointerEvents="none" style={styles.ambientBottomGlow} />
        </>
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
  sunsetBloomCore: {
    position: "absolute",
    top: "24%",
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 204, 170, 0.38)",
    opacity: 0.85,
  },
  sunsetBloomHalo: {
    position: "absolute",
    top: "18%",
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(232, 165, 152, 0.18)",
  },
  ambientBottomGlow: {
    position: "absolute",
    bottom: "12%",
    left: "15%",
    right: "15%",
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(56, 139, 255, 0.05)",
  },
  lightSunBloom: {
    position: "absolute",
    top: "22%",
    right: 10,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245, 194, 182, 0.45)",
  },
});
