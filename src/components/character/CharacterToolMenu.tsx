import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CloudColourId, EnvironmentId } from "../../types";
import { CANONICAL_ENVIRONMENTS } from "../../domain/environments/presets";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

export type CharacterTool =
  | "colour"
  | "face"
  | "character"
  | "environment"
  | "edit";

interface ToolItem {
  id: CharacterTool;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TOOLS: ToolItem[] = [
  { id: "colour", label: "Colour", icon: "color-palette" },
  { id: "face", label: "Mood", icon: "happy" },
  { id: "character", label: "Studio", icon: "sparkles" },
  { id: "environment", label: "World", icon: "earth" },
  { id: "edit", label: "Lab", icon: "flask" },
];

const ARC_START = 205; // degrees (upper left)
const ARC_END = 335;   // degrees (upper right)

interface CharacterToolMenuProps {
  open: boolean;
  onClose: () => void;
  screenSize: number;
  colourId?: CloudColourId;
  onColourChange?: (colour: CloudColourId) => void;
  environment?: EnvironmentId;
  onEnvironmentChange?: (env: EnvironmentId) => void;
  onTriggerExpression?: (id: string) => void;
}

export function CharacterToolMenu({
  open,
  onClose,
  screenSize,
  colourId = "purple-void",
  onColourChange,
  environment = "scenic",
  onEnvironmentChange,
  onTriggerExpression,
}: CharacterToolMenuProps) {
  const router = useRouter();
  const feedback = useFeedback();
  const { width: windowWidth } = useWindowDimensions();

  const [activeSubmenu, setActiveSubmenu] = useState<CharacterTool | null>(null);

  // Geometric center & radii
  const centre = screenSize / 2;
  const orbSize = 44;
  const radius = Math.min(windowWidth * 0.38, screenSize * 0.52);
  const angleStep = (ARC_END - ARC_START) / (TOOLS.length - 1);

  // Reanimated shared values for each tool orb (0 = inside, 1 = deployed)
  const anim0 = useSharedValue(0);
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);
  const anim3 = useSharedValue(0);
  const anim4 = useSharedValue(0);
  const anims = useMemo(() => [anim0, anim1, anim2, anim3, anim4], [anim0, anim1, anim2, anim3, anim4]);

  // Spring animation on open/close with 38ms stagger
  useEffect(() => {
    const springConfig = {
      damping: 14,
      stiffness: 140,
      mass: 0.85,
    };

    if (open) {
      anims.forEach((anim, idx) => {
        anim.value = withDelay(idx * 38, withSpring(1, springConfig));
      });
    } else {
      anims.forEach((anim, idx) => {
        // Reverse order on close
        const reverseIdx = anims.length - 1 - idx;
        anim.value = withDelay(reverseIdx * 25, withSpring(0, springConfig));
      });
    }
  }, [open, anims]);

  // If menu is closed, active submenu is suppressed
  const activeToolSubmenu = open ? activeSubmenu : null;

  // Compute tool positions
  const toolPositions = useMemo(() => {
    return TOOLS.map((tool, idx) => {
      const angleDeg = ARC_START + angleStep * idx;
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetX = Math.cos(angleRad) * radius;
      const targetY = Math.sin(angleRad) * radius;
      return { tool, angleRad, targetX, targetY };
    });
  }, [radius, angleStep]);

  const handleToolPress = (toolId: CharacterTool) => {
    feedback("tick");
    if (toolId === "character") {
      setActiveSubmenu(null);
      onClose();
      router.push("/(tabs)/character");
      return;
    }
    if (toolId === "edit") {
      setActiveSubmenu(null);
      onClose();
      router.push("/dev-lab");
      return;
    }
    setActiveSubmenu((current) => (current === toolId ? null : toolId));
  };

  if (!open && anims.every((a) => a.value === 0)) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      {/* 1. Backdrop Touch Dismiss (only intercepts touches outside tool buttons) */}
      <Pressable
        onPress={() => {
          feedback("tick");
          setActiveSubmenu(null);
          onClose();
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. SVG Liquid Metanecks Layer (Metaballs stretching and snapping) */}
      <Svg
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { width: screenSize, height: screenSize },
        ]}
      >
        <Defs>
          <SvgLinearGradient id="metaneckGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="rgba(255, 255, 255, 0.45)" stopOpacity="0.45" />
            <Stop offset="0.5" stopColor="rgba(196, 165, 255, 0.32)" stopOpacity="0.32" />
            <Stop offset="1" stopColor="rgba(140, 180, 255, 0.40)" stopOpacity="0.40" />
          </SvgLinearGradient>
        </Defs>

        {toolPositions.map((pos, idx) => (
          <LiquidMetaneck
            key={`metaneck-${pos.tool.id}`}
            progress={anims[idx]}
            centre={centre}
            targetX={pos.targetX}
            targetY={pos.targetY}
            orbRadius={orbSize / 2}
          />
        ))}
      </Svg>

      {/* 3. Character Tool Buttons (Optical Glass Orbs) */}
      {toolPositions.map((pos, idx) => (
        <ToolOrbButton
          key={pos.tool.id}
          tool={pos.tool}
          progress={anims[idx]}
          centre={centre}
          targetX={pos.targetX}
          targetY={pos.targetY}
          orbSize={orbSize}
          active={activeToolSubmenu === pos.tool.id}
          onPress={() => handleToolPress(pos.tool.id)}
        />
      ))}

      {/* 4. Interactive Submenus (Colour Swatches, Environments, Quick Moods) */}
      {activeToolSubmenu === "colour" && (
        <ColourSubmenu
          centre={centre}
          radius={radius}
          currentColor={colourId}
          onSelect={(col) => {
            feedback("tick");
            onColourChange?.(col);
          }}
        />
      )}

      {activeToolSubmenu === "environment" && (
        <EnvironmentSubmenu
          centre={centre}
          radius={radius}
          currentEnv={environment}
          onSelect={(env) => {
            feedback("tick");
            onEnvironmentChange?.(env);
          }}
        />
      )}

      {activeToolSubmenu === "face" && (
        <FaceSubmenu
          centre={centre}
          radius={radius}
          onTrigger={(exprId) => {
            feedback("success");
            onTriggerExpression?.(exprId);
          }}
          onOpenStudio={() => {
            setActiveSubmenu(null);
            onClose();
            router.push("/(tabs)/character");
          }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Native SVG Liquid Metaneck (Dynamic Bezier metaball neck connecting circles)
// ---------------------------------------------------------------------------
function LiquidMetaneck({
  progress,
  centre,
  targetX,
  targetY,
  orbRadius,
}: {
  progress: SharedValue<number>;
  centre: number;
  targetX: number;
  targetY: number;
  orbRadius: number;
}) {
  const animatedPathProps = useAnimatedStyle(() => {
    const p = progress.value;
    // When snapped (p > 0.68) or at rest (p < 0.05), neck is retracted/invisible
    if (p < 0.04 || p > 0.68) {
      return { opacity: 0 };
    }

    const opacity = interpolate(p, [0.04, 0.22, 0.52, 0.68], [0, 0.85, 0.6, 0]);
    return { opacity };
  });

  // Calculate static path for peak stretch
  const angle = Math.atan2(targetY, targetX);
  const normX = -Math.sin(angle);
  const normY = Math.cos(angle);

  // Character anchor
  const charR = orbRadius * 1.8;
  const startX = centre + Math.cos(angle) * charR;
  const startY = centre + Math.sin(angle) * charR;

  // Mid orb position during stretch
  const midDist = Math.hypot(targetX, targetY) * 0.52;
  const orbX = centre + Math.cos(angle) * midDist;
  const orbY = centre + Math.sin(angle) * midDist;

  // Tangents
  const spread1 = charR * 0.65;
  const spread2 = orbRadius * 0.60;
  const p1x = startX + normX * spread1;
  const p1y = startY + normY * spread1;
  const p2x = startX - normX * spread1;
  const p2y = startY - normY * spread1;

  const p3x = orbX + normX * spread2;
  const p3y = orbY + normY * spread2;
  const p4x = orbX - normX * spread2;
  const p4y = orbY - normY * spread2;

  // Inward pinch control points
  const pinch = 8;
  const midX = (startX + orbX) / 2;
  const midY = (startY + orbY) / 2;
  const c1x = midX + normX * pinch;
  const c1y = midY + normY * pinch;
  const c2x = midX - normX * pinch;
  const c2y = midY - normY * pinch;

  const d = `M ${p1x} ${p1y} Q ${c1x} ${c1y} ${p3x} ${p3y} L ${p4x} ${p4y} Q ${c2x} ${c2y} ${p2x} ${p2y} Z`;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedPathProps]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Path d={d} fill="url(#metaneckGrad)" stroke="rgba(255, 255, 255, 0.45)" strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Optical Glass Orb Tool Button
// ---------------------------------------------------------------------------
function ToolOrbButton({
  tool,
  progress,
  centre,
  targetX,
  targetY,
  orbSize,
  active,
  onPress,
}: {
  tool: ToolItem;
  progress: SharedValue<number>;
  centre: number;
  targetX: number;
  targetY: number;
  orbSize: number;
  active: boolean;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const currentX = centre + targetX * p - orbSize / 2;
    const currentY = centre + targetY * p - orbSize / 2;

    // Organic directional stretch during peel
    const stretch = interpolate(p, [0, 0.4, 0.85, 1], [0.6, 1.25, 1.06, 1]);
    const scaleY = interpolate(p, [0, 0.4, 0.85, 1], [0.6, 0.88, 0.98, 1]);
    const opacity = interpolate(p, [0, 0.08, 1], [0, 1, 1]);

    return {
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { scaleX: stretch },
        { scaleY },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.orbWrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tool.label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.orbBody,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            borderColor: active
              ? "#388BFF"
              : pressed
                ? "rgba(255, 255, 255, 0.75)"
                : "rgba(255, 255, 255, 0.38)",
            backgroundColor: active
              ? "rgba(56, 139, 255, 0.28)"
              : "rgba(22, 32, 54, 0.62)",
            shadowColor: active ? "#388BFF" : "#60A5FA",
            shadowOpacity: active ? 0.65 : 0.35,
          },
        ]}
      >
        {/* Top-left specular glare highlight */}
        <View pointerEvents="none" style={styles.orbSpecularGlare} />

        {/* Crisp vector icon */}
        <Ionicons
          name={tool.icon}
          size={20}
          color={active ? "#93C5FD" : "#FFFFFF"}
        />
      </Pressable>

      {/* Floating subtle label */}
      <Text style={[styles.orbLabel, active && { color: "#93C5FD", fontWeight: "700" }]}>
        {tool.label}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Colour Swatch Liquid Submenu
// ---------------------------------------------------------------------------
const SWATCHES: CloudColourId[] = [
  "white",
  "blue",
  "purple-void",
  "mint",
  "pink",
  "peach",
];

const SWATCH_HEX: Record<string, string> = {
  white: "#F8FAFC",
  blue: "#60A5FA",
  "purple-void": "#C4A5FF",
  lavender: "#C4A5FF",
  mint: "#4ADE80",
  pink: "#F472B6",
  peach: "#FB923C",
};

function ColourSubmenu({
  centre,
  radius,
  currentColor,
  onSelect,
}: {
  centre: number;
  radius: number;
  currentColor: CloudColourId;
  onSelect: (id: CloudColourId) => void;
}) {
  return (
    <View
      style={[
        styles.submenuContainer,
        {
          top: centre - radius * 0.35,
          left: 14,
          right: 14,
        },
      ]}
    >
      <View style={styles.submenuCard}>
        <Text style={styles.submenuTitle}>Cloud Tint</Text>
        <View style={styles.swatchRow}>
          {SWATCHES.map((col) => {
            const isSelected =
              currentColor === col ||
              (col === "purple-void" && currentColor === "lavender");
            const hex = SWATCH_HEX[col] || "#FFFFFF";
            return (
              <Pressable
                key={col}
                accessibilityRole="button"
                accessibilityLabel={`Select ${col}`}
                onPress={() => onSelect(col)}
                style={[
                  styles.swatchDot,
                  {
                    backgroundColor: hex,
                    borderColor: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.25)",
                    transform: [{ scale: isSelected ? 1.25 : 1.0 }],
                  },
                ]}
              >
                {isSelected && <View style={styles.swatchSelectedIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Environment Selector Liquid Submenu
// ---------------------------------------------------------------------------
function EnvironmentSubmenu({
  centre,
  radius,
  currentEnv,
  onSelect,
}: {
  centre: number;
  radius: number;
  currentEnv: EnvironmentId;
  onSelect: (env: EnvironmentId) => void;
}) {
  const normCurrent = (currentEnv || "scenic").toLowerCase();

  return (
    <View
      style={[
        styles.submenuContainer,
        {
          top: centre - radius * 0.35,
          left: 14,
          right: 14,
        },
      ]}
    >
      <View style={styles.submenuCard}>
        <Text style={styles.submenuTitle}>Environment Backdrop</Text>
        <View style={styles.envPillRow}>
          {CANONICAL_ENVIRONMENTS.map((e) => {
            const isSelected =
              normCurrent === e.id ||
              (e.id === "scenic" && (normCurrent === "bg-a" || !currentEnv)) ||
              (e.id === "scenic-b" && normCurrent === "bg-b") ||
              (e.id === "zen" && (normCurrent === "sand" || normCurrent === "warm-stone")) ||
              (e.id === "dark" && (normCurrent === "amoled" || normCurrent === "sky"));
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${e.label}`}
                onPress={() => onSelect(e.id)}
                style={[
                  styles.envPill,
                  isSelected && styles.envPillSelected,
                ]}
              >
                <Text style={[styles.envPillText, isSelected && styles.envPillTextSelected]}>
                  {e.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quick Mood / Face Reaction Submenu
// ---------------------------------------------------------------------------
const QUICK_MOODS = [
  { id: "JOY_HOP", label: "Happy", icon: "happy" as const },
  { id: "EXCITED_WIGGLE", label: "Playful", icon: "sparkles" as const },
  { id: "CURIOUS_DOUBLE_TAKE", label: "Curious", icon: "search" as const },
  { id: "SLEEPY_YAWN", label: "Calm", icon: "moon" as const },
];

function FaceSubmenu({
  centre,
  radius,
  onTrigger,
  onOpenStudio,
}: {
  centre: number;
  radius: number;
  onTrigger: (id: string) => void;
  onOpenStudio: () => void;
}) {
  return (
    <View
      style={[
        styles.submenuContainer,
        {
          top: centre - radius * 0.35,
          left: 14,
          right: 14,
        },
      ]}
    >
      <View style={styles.submenuCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.submenuTitle}>Quick Mood</Text>
          <Pressable onPress={onOpenStudio} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 11, color: "#60A5FA", fontWeight: "600" }}>Studio</Text>
            <Ionicons name="chevron-forward" size={12} color="#60A5FA" />
          </Pressable>
        </View>
        <View style={styles.moodRow}>
          {QUICK_MOODS.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`Trigger ${m.label}`}
              onPress={() => onTrigger(m.id)}
              style={styles.moodReactionChip}
            >
              <Ionicons name={m.icon} size={15} color="#FFFFFF" />
              <Text style={styles.moodChipText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orbWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    zIndex: 50,
  },
  orbBody: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    shadowRadius: 10,
    elevation: 6,
  },
  orbSpecularGlare: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.70)",
  },
  orbLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.8,
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  submenuContainer: {
    position: "absolute",
    alignItems: "center",
    zIndex: 60,
  },
  submenuCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(18, 26, 44, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  submenuTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.75)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  swatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  swatchDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  swatchSelectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  envPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  envPill: {
    width: "48%",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  envPillSelected: {
    backgroundColor: "rgba(56, 139, 255, 0.28)",
    borderColor: "#388BFF",
  },
  envPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)",
  },
  envPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodReactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  moodChipText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
