import React from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextInput,
  TextInputProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useTheme, Radius } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { useReducedMotion } from "./Kit";

const RING_IMAGE = require("../../../assets/images/ring-glass.png");

// ---------------------------------------------------------------------------
// 1. GlassSurface: Translucent frosted glass panel with fine white edge
// ---------------------------------------------------------------------------
export function GlassSurface({
  children,
  style,
  level = "normal",
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  level?: "subtle" | "normal" | "elevated" | "strong";
}) {
  const c = useTheme();

  const bg =
    level === "subtle"
      ? "rgba(255, 255, 255, 0.05)"
      : level === "elevated"
        ? c.glassElevated
        : level === "strong"
          ? c.glassStrong
          : c.glass;

  return (
    <View
      style={[
        styles.glassSurface,
        {
          backgroundColor: bg,
          borderColor: c.glassBorder,
        },
        style,
      ]}
    >
      {/* Top subtle highlight rim */}
      <View
        pointerEvents="none"
        style={[styles.surfaceHighlight, { borderColor: c.glassBorderHighlight }]}
      />
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2. GlassCard: Container with breathing room and subtle glass depth
// ---------------------------------------------------------------------------
export function GlassCard({
  children,
  style,
  level = "normal",
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  level?: "subtle" | "normal" | "elevated" | "strong";
}) {
  return (
    <GlassSurface
      level={level}
      style={[
        {
          borderRadius: 24,
          padding: 18,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}

// ---------------------------------------------------------------------------
// 3. GlassPill: Capsule button or badge (e.g. Studio pill in header)
// ---------------------------------------------------------------------------
export function GlassPill({
  children,
  onPress,
  selected = false,
  glow = false,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const feedback = useFeedback();
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(1));

  const animate = (toValue: number) => {
    if (!reduced) {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        stiffness: 420,
        damping: 30,
        mass: 0.5,
      }).start();
    }
  };

  const content = (
    <View
      style={[
        styles.glassPill,
        {
          backgroundColor: selected
            ? c.accent
            : glow
              ? "rgba(56, 139, 255, 0.16)"
              : "rgba(255, 255, 255, 0.08)",
          borderColor: selected
            ? c.electricBlue
            : glow
              ? "rgba(56, 139, 255, 0.45)"
              : c.glassBorder,
          shadowColor: selected || glow ? c.electricBlue : "transparent",
          shadowOpacity: selected || glow ? 0.45 : 0,
          shadowRadius: 10,
          elevation: selected || glow ? 3 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          feedback("click");
          onPress();
        }}
        onPressIn={() => animate(0.95)}
        onPressOut={() => animate(1)}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 4. GlassCircleButton: Circular glass button with fine rim & optional halo
// ---------------------------------------------------------------------------
export function GlassCircleButton({
  children,
  onPress,
  label,
  size = 54,
  selected = false,
  sublabel,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  size?: number;
  selected?: boolean;
  sublabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const feedback = useFeedback();
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(1));

  const animate = (toValue: number) => {
    if (!reduced) {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        stiffness: 420,
        damping: 32,
        mass: 0.5,
      }).start();
    }
  };

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={disabled}
          onPress={() => {
            feedback("tick");
            onPress();
          }}
          onPressIn={() => animate(0.92)}
          onPressOut={() => animate(1)}
          style={({ pressed }) => [
            styles.glassCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: selected
                ? "rgba(45, 95, 210, 0.38)"
                : "rgba(255, 255, 255, 0.09)",
              borderColor: selected ? "rgba(100, 180, 255, 0.85)" : "rgba(255, 255, 255, 0.26)",
              borderWidth: 1,
              shadowColor: selected ? "#388BFF" : "rgba(0, 0, 0, 0.35)",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: selected ? 0.45 : 0.25,
              shadowRadius: selected ? 10 : 6,
              elevation: selected ? 5 : 2,
              opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
            },
            style,
          ]}
        >
          {/* Subtle top edge specular highlight */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 1.5,
              width: size * 0.55,
              height: 1.2,
              borderRadius: 1,
              backgroundColor: "rgba(255, 255, 255, 0.55)",
            }}
          />

          {/* Glowing blue halo ring for selected state */}
          {selected && (
            <View
              pointerEvents="none"
              style={[
                styles.selectedHalo,
                {
                  width: size + 8,
                  height: size + 8,
                  borderRadius: (size + 8) / 2,
                  borderColor: "rgba(56, 139, 255, 0.40)",
                  borderWidth: 1,
                },
              ]}
            />
          )}
          {children}
        </Pressable>
      </Animated.View>
      {sublabel && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: selected ? c.electricBlue : c.textSecondary,
            textAlign: "center",
          }}
        >
          {sublabel}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 5. GlassSegmentedControl: Premium sliding segment switch
// ---------------------------------------------------------------------------
export function GlassSegmentedControl<T extends string>({
  items,
  selected,
  onSelect,
  renderIcon,
}: {
  items: readonly { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  renderIcon?: (id: T, isSelected: boolean) => React.ReactNode;
}) {
  const c = useTheme();
  const feedback = useFeedback();

  return (
    <View
      style={[
        styles.segmentedContainer,
        {
          backgroundColor: "rgba(18, 24, 44, 0.48)",
          borderColor: "rgba(255, 255, 255, 0.20)",
        },
      ]}
    >
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              feedback("tick");
              onSelect(item.id);
            }}
            style={[
              styles.segmentedItem,
              isSelected && {
                backgroundColor: "rgba(75, 145, 255, 0.28)",
                borderColor: "rgba(120, 185, 255, 0.65)",
                shadowColor: "#388BFF",
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
          >
            {renderIcon && renderIcon(item.id, isSelected)}
            <Text
              style={[
                styles.segmentedText,
                {
                  color: isSelected ? "#FFFFFF" : c.textSecondary,
                  fontWeight: isSelected ? "600" : "500",
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 6. GlassTextField: Translucent search & input field
// ---------------------------------------------------------------------------
export function GlassTextField({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  const c = useTheme();

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ fontSize: 13, color: c.textSecondary, fontWeight: "500" }}>
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={c.textTertiary}
        {...props}
        style={[
          styles.glassInput,
          {
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            borderColor: c.glassBorder,
            color: c.text,
          },
          props.style,
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 7. GlowButton: Wide illuminated electric-blue action button
// ---------------------------------------------------------------------------
export function GlowButton({
  title,
  onPress,
  icon,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const feedback = useFeedback();
  const reduced = useReducedMotion();
  const [scale] = React.useState(() => new Animated.Value(1));

  const animate = (toValue: number) => {
    if (!reduced) {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        stiffness: 400,
        damping: 30,
        mass: 0.5,
      }).start();
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          feedback("success");
          onPress();
        }}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [
          styles.glowButtonWrapper,
          { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
        ]}
      >
        <LinearGradient
          colors={["#4FA1FF", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.glowButtonGradient}
        >
          {icon}
          <Text style={styles.glowButtonText}>{title}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 8. StatusDot: Luminous status indicator (e.g. green active dot)
// ---------------------------------------------------------------------------
export function StatusDot({
  color = "#10B981",
  size = 7,
  pulse = true,
}: {
  color?: string;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      {pulse && (
        <View
          style={{
            position: "absolute",
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: color,
            opacity: 0.35,
          }}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 9. GlassOrbFrame: Apple-like optical glass sphere enclosing Cherri on Home
// Features:
// - Completely transparent central optical lens
// - Specular bright outer rim (1.0px) with soft celestial bloom
// - Concentric double refraction edge (2.5px inset, delicate lilac/blue caustics)
// - Top-left delicate specular crescent glare arc
// - Top-left secondary caustic glint
// - Bottom-right opposing warm sunset bounce highlight
// - Translucent shadow-receiving ground lens in bottom ~28% so contact shadow
//   contrasts vividly without covering the background
// - Crucial: ALL decorative overlays have pointerEvents="none" so touches reach
//   the live canvas inside!
// ---------------------------------------------------------------------------
export function GlassOrbFrame({
  size,
  environment,
  children,
}: {
  size: number;
  environment?: string;
  children: React.ReactNode;
}) {
  const envNorm = (environment || "scenic").toLowerCase();
  const isSand = envNorm === "zen" || envNorm === "sand" || envNorm === "warm-stone";
  const isDark = envNorm === "dark" || envNorm === "amoled" || envNorm === "sky";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* 1. BACK OPTICAL LAYER: Environment-aware soft diffuse ground pad (behind character & shadow) */}
      <View
        pointerEvents="none"
        style={[
          styles.softGroundGlowContainer,
          {
            width: size,
            height: size,
          },
        ]}
      >
        <LinearGradient
          colors={
            isSand
              ? [
                  "rgba(255, 245, 230, 0.00)",
                  "rgba(221, 203, 181, 0.16)",
                  "rgba(185, 155, 122, 0.22)",
                  "rgba(140, 110, 80, 0.00)",
                ]
              : isDark
                ? [
                    "rgba(255, 255, 255, 0.00)",
                    "rgba(100, 150, 255, 0.08)",
                    "rgba(56, 139, 255, 0.12)",
                    "rgba(30, 60, 140, 0.00)",
                  ]
                : [
                    // Scenic Sunset (Alpine Lake / Rocky Shore): Warm ambient diffuse glow
                    "rgba(255, 240, 220, 0.00)",
                    "rgba(255, 220, 180, 0.14)",
                    "rgba(245, 195, 150, 0.20)",
                    "rgba(215, 160, 110, 0.00)",
                  ]
          }
          locations={[0, 0.35, 0.70, 1]}
          style={[
            styles.softGroundPad,
            {
              width: size * 0.78,
              height: size * 0.28,
              top: size * 0.62,
              left: size * 0.11,
              borderRadius: (size * 0.28) / 2,
            },
          ]}
        />
      </View>

      {/* 2. Live Cloud Character (Canvas / WebView receiving touches) */}
      {children}

      {/* 3. FRONT OPTICAL LAYER: Dedicated Transparent Glass Ring PNG */}
      {/* Restrained soft optical backglow */}
      <View
        pointerEvents="none"
        style={[
          styles.ringSoftBackdropGlow,
          {
            width: size * 0.94,
            height: size * 0.94,
            borderRadius: (size * 0.94) / 2,
            top: size * 0.03,
            left: size * 0.03,
          },
        ]}
      />

      {/* High-res Apple Vision Pro-style transparent optical glass ring asset */}
      <ExpoImage
        source={RING_IMAGE}
        style={[
          styles.ringOverlayImage,
          {
            width: size,
            height: size,
          },
        ]}
        contentFit="contain"
        pointerEvents="none"
        priority="high"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glassSurface: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  surfaceHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    opacity: 0.85,
  },
  glassPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  glassCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  selectedHalo: {
    position: "absolute",
    borderWidth: 1.5,
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: Radius.pill,
    padding: 3,
    borderWidth: 1,
    alignItems: "center",
  },
  segmentedItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentedText: {
    fontSize: 13,
  },
  glassInput: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  glowButtonWrapper: {
    borderRadius: Radius.pill,
    overflow: "hidden",
    shadowColor: "#388BFF",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  glowButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  glowButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  softGroundGlowContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  softGroundPad: {
    position: "absolute",
    opacity: 0.92,
  },
  ringSoftBackdropGlow: {
    position: "absolute",
    shadowColor: "#8EB5FF",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 3,
  },
  ringOverlayImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
