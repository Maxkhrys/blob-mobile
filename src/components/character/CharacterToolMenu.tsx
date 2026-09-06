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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CloudColourId, EnvironmentId, CloudEmotion } from "../../types";
import { CANONICAL_ENVIRONMENTS } from "../../domain/environments/presets";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

export type CharacterTool =
  | "colour"
  | "face"
  | "character"
  | "environment"
  | "edit";

export interface MoodPreset {
  id: "CALM" | "HAPPY" | "CURIOUS" | "FOCUSED" | "SLEEPY";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  behaviour: string;
  emotion: CloudEmotion;
  tagline: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  { id: "CALM", label: "Calm", icon: "leaf-outline", behaviour: "FLOAT_DRIFT", emotion: "idle", tagline: "Breathing rest" },
  { id: "HAPPY", label: "Happy", icon: "happy-outline", behaviour: "HAPPY_BOUNCE", emotion: "happy", tagline: "Joyful bounce" },
  { id: "CURIOUS", label: "Curious", icon: "search-outline", behaviour: "CURIOUS_DOUBLE_TAKE", emotion: "curious", tagline: "Double take" },
  { id: "FOCUSED", label: "Focused", icon: "flash-outline", behaviour: "NOD_YES", emotion: "idle", tagline: "Attentive nod" },
  { id: "SLEEPY", label: "Sleepy", icon: "moon-outline", behaviour: "SLEEPY_YAWN", emotion: "sleepy", tagline: "Gentle yawn" },
];

interface ToolItem {
  id: CharacterTool;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  angleDeg: number;
}

// Strictly ordered left-to-right across the upper halo
const TOOLS: ToolItem[] = [
  { id: "colour", label: "Colour", icon: "color-palette", angleDeg: 200 },
  { id: "face", label: "Mood", icon: "happy-outline", angleDeg: 235 },
  { id: "character", label: "Studio", icon: "sparkles", angleDeg: 270 },
  { id: "environment", label: "World", icon: "earth", angleDeg: 305 },
  { id: "edit", label: "Lab", icon: "flask", angleDeg: 340 },
];

interface CharacterToolMenuProps {
  open: boolean;
  onClose: () => void;
  stageSize?: number;
  screenSize?: number;
  colourId?: CloudColourId;
  onColourChange?: (colour: CloudColourId) => void;
  environment?: EnvironmentId;
  onEnvironmentChange?: (env: EnvironmentId) => void;
  onTriggerExpression?: (id: string) => void;
  onMoodSelect?: (mood: MoodPreset) => void;
  currentMoodId?: string;
}

export function CharacterToolMenu({
  open,
  onClose,
  stageSize,
  screenSize,
  colourId = "purple-void",
  onColourChange,
  environment = "scenic",
  onEnvironmentChange,
  onTriggerExpression,
  onMoodSelect,
  currentMoodId = "CALM",
}: CharacterToolMenuProps) {
  const router = useRouter();
  const feedback = useFeedback();
  const { width: windowWidth } = useWindowDimensions();

  const [activeSubmenu, setActiveSubmenu] = useState<CharacterTool | null>(null);

  // Geometric center & radii
  const effectiveStage = stageSize || screenSize || 300;
  const centre = effectiveStage / 2;
  const orbSize = 44;

  // Arc angles: 200, 235, 270, 305, 340.
  // Maximum horizontal offset from center occurs at 200° and 340°: cos(200°) = -0.93969.
  // Ensure the outer edge stays safely within screen margin:
  const maxRadiusByWidth =
    (windowWidth / 2 - orbSize / 2 - 16) / Math.abs(Math.cos((200 * Math.PI) / 180));
  const desiredRadius = effectiveStage * 0.58;
  const radius = Math.min(desiredRadius, maxRadiusByWidth);

  // Reanimated shared values for each tool orb (0 = retracted near ring, 1 = deployed)
  const anim0 = useSharedValue(0);
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);
  const anim3 = useSharedValue(0);
  const anim4 = useSharedValue(0);
  const anims = useMemo(
    () => [anim0, anim1, anim2, anim3, anim4],
    [anim0, anim1, anim2, anim3, anim4],
  );

  // Staggered spring animations:
  // Open: 52ms stagger left-to-right (Colour -> Mood -> Studio -> World -> Lab)
  // Close: 38ms stagger right-to-left (Lab -> World -> Studio -> Mood -> Colour)
  useEffect(() => {
    const openSpringConfig = {
      damping: 14,
      stiffness: 165,
      mass: 0.65,
    };
    const closeSpringConfig = {
      damping: 17,
      stiffness: 210,
      mass: 0.60,
    };

    if (open) {
      anims.forEach((anim, idx) => {
        anim.value = withDelay(idx * 52, withSpring(1, openSpringConfig));
      });
    } else {
      anims.forEach((anim, idx) => {
        const reverseIdx = anims.length - 1 - idx;
        anim.value = withDelay(reverseIdx * 38, withSpring(0, closeSpringConfig));
      });
    }
  }, [open, anims]);

  // If menu is closed, active submenu is suppressed
  const activeToolSubmenu = open ? activeSubmenu : null;

  // Compute tool positions based on explicit left-to-right angles
  const toolPositions = useMemo(() => {
    return TOOLS.map((tool) => {
      const angleRad = (tool.angleDeg * Math.PI) / 180;
      const targetX = Math.cos(angleRad) * radius;
      const targetY = Math.sin(angleRad) * radius;
      return { tool, angleRad, targetX, targetY };
    });
  }, [radius]);

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
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {
          width: effectiveStage,
          height: effectiveStage,
          overflow: "visible",
          zIndex: 40,
        },
      ]}
    >
      {/* 1. Character Tool Buttons (Crispy Optical Glass Orbs) */}
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

      {/* 2. Interactive Submenus (Colour Swatches, Environments, Quick Moods) */}
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
        <MoodSubmenu
          centre={centre}
          radius={radius}
          currentMoodId={currentMoodId}
          onSelectMood={(mood) => {
            feedback("success");
            onMoodSelect?.(mood);
            onTriggerExpression?.(mood.behaviour);
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
// Optical Glass Orb Tool Button (Translucent Smoky-Blue Glass Material)
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

    // Start near ring edge (~0.70 of radius) and deploy outward along radial path
    const startRatio = 0.70;
    const radialRatio = startRatio + (1.0 - startRatio) * p;
    const currentX = centre + targetX * radialRatio - orbSize / 2;
    const currentY = centre + targetY * radialRatio - orbSize / 2;

    // Snappy attack, tiny 5% overshoot, quick controlled settle (subtle organic stretch max 5%)
    const scaleX = interpolate(p, [0, 0.45, 0.82, 1], [0.70, 1.05, 1.05, 1.0]);
    const scaleY = interpolate(p, [0, 0.45, 0.82, 1], [0.70, 0.97, 1.04, 1.0]);
    const opacity = interpolate(p, [0, 0.22], [0, 1]);

    return {
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { scaleX },
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
              ? "rgba(147, 197, 253, 0.85)"
              : pressed
                ? "rgba(255, 255, 255, 0.65)"
                : "rgba(255, 255, 255, 0.28)",
            backgroundColor: active
              ? "rgba(42, 76, 132, 0.68)"
              : pressed
                ? "rgba(45, 62, 92, 0.75)"
                : "rgba(28, 40, 62, 0.62)",
            shadowColor: active ? "#388BFF" : "#0A1020",
            shadowOpacity: active ? 0.45 : 0.35,
          },
        ]}
      >
        {/* Subtle inner top glow */}
        <View pointerEvents="none" style={styles.orbInnerGlow} />

        {/* Crisp specular glare highlight */}
        <View pointerEvents="none" style={styles.orbSpecularGlare} />

        {/* Clean, consistently weighted icon */}
        <Ionicons
          name={tool.icon}
          size={18}
          color={active ? "#93C5FD" : "#FFFFFF"}
        />
      </Pressable>

      {/* Small crisp white label beneath */}
      <Text
        numberOfLines={1}
        style={[styles.orbLabel, active && styles.orbLabelActive]}
      >
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
          top: centre - radius * 0.38,
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
          top: centre - radius * 0.38,
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
// Budding 5-Mood Submenu (Calm, Happy, Curious, Focused, Sleepy)
// ---------------------------------------------------------------------------
function MoodSubmenu({
  centre,
  radius,
  currentMoodId,
  onSelectMood,
  onOpenStudio,
}: {
  centre: number;
  radius: number;
  currentMoodId?: string;
  onSelectMood: (mood: MoodPreset) => void;
  onOpenStudio: () => void;
}) {
  return (
    <View
      style={[
        styles.submenuContainer,
        {
          top: centre - radius * 0.38,
          left: 14,
          right: 14,
        },
      ]}
    >
      <View style={styles.submenuCard}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.submenuTitle}>Cherri Mood</Text>
          <Pressable
            onPress={onOpenStudio}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text style={{ fontSize: 11, color: "#60A5FA", fontWeight: "600" }}>
              Studio
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#60A5FA" />
          </Pressable>
        </View>
        <View style={styles.moodRow}>
          {MOOD_PRESETS.map((m) => {
            const isSelected = currentMoodId === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`Mood: ${m.label}`}
                onPress={() => onSelectMood(m)}
                style={[
                  styles.moodReactionChip,
                  isSelected && styles.moodReactionChipSelected,
                ]}
              >
                <Ionicons
                  name={m.icon}
                  size={15}
                  color={isSelected ? "#93C5FD" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.moodChipText,
                    isSelected && styles.moodChipTextSelected,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
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
    width: 56,
    marginLeft: -6, // Centers 56px wide container on 44px orb
    alignItems: "center",
    zIndex: 50,
  },
  orbBody: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  orbInnerGlow: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 4,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  orbSpecularGlare: {
    position: "absolute",
    top: 3,
    width: 18,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  orbLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.90)",
    letterSpacing: 0.3,
    marginTop: 4,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  orbLabelActive: {
    color: "#93C5FD",
    fontWeight: "700",
  },
  submenuContainer: {
    position: "absolute",
    alignItems: "center",
    zIndex: 60,
  },
  submenuCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(18, 26, 44, 0.84)",
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
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  moodReactionChipSelected: {
    backgroundColor: "rgba(56, 139, 255, 0.28)",
    borderColor: "#388BFF",
  },
  moodChipText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
  },
  moodChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
