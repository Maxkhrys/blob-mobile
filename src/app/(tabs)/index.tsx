import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { CharacterStudioModal } from "../../components/character/CharacterStudioModal";
import { Screen, Avatar, layout } from "../../components/ui/Kit";
import {
  GlassPill,
  GlassCircleButton,
  GlassOrbFrame,
  StatusDot,
} from "../../components/ui/Glass";
import { useTheme } from "../../constants/theme";
import { narrative } from "../../components/home/narrative";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

import { CloudEmotion } from "../../types";

type MoodType = "CALM" | "HAPPY" | "CURIOUS" | "FOCUSED" | "SLEEPY";

const MOODS: readonly { id: MoodType; label: string; behaviour: string; emotion: CloudEmotion }[] = [
  { id: "CALM", label: "CALM", behaviour: "FLOAT_DRIFT", emotion: "idle" },
  { id: "HAPPY", label: "HAPPY", behaviour: "HAPPY_BOUNCE", emotion: "happy" },
  { id: "CURIOUS", label: "CURIOUS", behaviour: "CURIOUS_DOUBLE_TAKE", emotion: "curious" },
  { id: "FOCUSED", label: "FOCUSED", behaviour: "NOD_YES", emotion: "idle" },
  { id: "SLEEPY", label: "SLEEPY", behaviour: "SLEEPY_YAWN", emotion: "sleepy" },
];

export default function HomeScreen() {
  const {
    profile,
    device,
    proximity,
    cloudEmotion,
    triggerEmotion,
    activeBehaviourId,
    triggerBehaviour,
    cloudSettings,
    drivers,
  } = useAppStore();

  const router = useRouter();
  const c = useTheme();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  const [studioVisible, setStudioVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType>("CALM");

  const name = proximity.driverName || "Your friend";
  const [title] = narrative(
    proximity.state,
    name,
    profile.characterName || "Your Cherri",
  );

  const nearby = drivers.filter((d) =>
    ["Nearby", "Approaching", "Very close", "Together"].includes(d.status),
  );

  // Dynamic preview size fitted for S22 screen height (~780) and width (~360)
  const previewSize = Math.min(width * 0.70, height * 0.32, 256);

  const handleMoodSelect = (mood: (typeof MOODS)[number]) => {
    feedback("tick");
    setSelectedMood(mood.id);
    triggerEmotion(mood.emotion);
    triggerBehaviour(mood.behaviour);
  };

  const handleSparkleHeroAction = () => {
    feedback("success");
    triggerBehaviour("JOY_HOP");
  };

  return (
    <Screen scrollable={false} variant="home">
      {/* 1. Top Bar: CHERRIPI Title, Hardware Status, Studio Pill & Profile Avatar */}
      <View style={layout.between}>
        <View style={{ gap: 3 }}>
          <Text style={styles.brandTitle}>CHERRIPI</Text>
          <View style={styles.statusRow}>
            <StatusDot
              color={device.state === "Connected" ? "#10B981" : "#F59E0B"}
              size={6}
            />
            <Text style={styles.statusSubtext}>
              {device.state === "Connected" ? "Active" : device.state} •{" "}
              {device.battery}%
            </Text>
          </View>
        </View>

        <View style={styles.topRightControls}>
          {/* Glass Studio Pill */}
          <GlassPill
            onPress={() => router.push("/(tabs)/character")}
            style={styles.studioPill}
          >
            <Ionicons name="color-wand-outline" size={14} color="#FFFFFF" />
            <Text style={styles.studioPillText}>Studio</Text>
          </GlassPill>

          {/* User Profile Avatar with fine glass rim */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Avatar name={profile.username} uri={profile.avatarUri} size={38} />
          </Pressable>
        </View>
      </View>

      {/* Atmospheric Brand Motto (inspired by reference) */}
      <View style={styles.mottoContainer}>
        <Text style={styles.mottoText}>A LITTLE COMPANY</Text>
        <Text style={styles.mottoText}>FOR WHEREVER YOU GO.</Text>
      </View>

      {/* 2. Hero Centerpiece: Glass Orb Frame enclosing Live Draggable Cloud */}
      <View style={styles.heroSection}>
        {/* Left Mood Rail (Active glowing ring + vertical mood triggers) */}
        <View style={styles.moodRail}>
          {MOODS.map((m) => {
            const isActive = selectedMood === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`Mood: ${m.label}`}
                onPress={() => handleMoodSelect(m)}
                style={styles.moodItem}
              >
                <View style={styles.moodDotWrapper}>
                  {isActive && <View style={styles.moodActiveHalo} />}
                  <View
                    style={[
                      styles.moodDot,
                      {
                        backgroundColor: isActive
                          ? c.electricBlue
                          : "rgba(255, 255, 255, 0.35)",
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.moodLabel,
                    {
                      color: isActive ? "#FFFFFF" : "rgba(240, 244, 252, 0.45)",
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* The Atmospheric Glass Bubble containing Live Cherri */}
        <GlassOrbFrame size={previewSize}>
          <CloudPreview
            size={previewSize - 12}
            colourId={profile.characterColour}
            environment={profile.environment}
            emotion={cloudEmotion}
            behaviourId={activeBehaviourId ?? undefined}
            cloudSettings={cloudSettings}
            proximityState={proximity.state}
            driverYaw={
              proximity.state === "HOME"
                ? 0
                : proximity.direction === "left"
                  ? -0.5
                  : proximity.direction === "right"
                    ? 0.5
                    : 0
            }
          />
        </GlassOrbFrame>
      </View>

      {/* 3. Four Large Circular Glass Actions Below Hero */}
      <View style={styles.actionsRow}>
        {/* Action 1: Expressions (Heart) */}
        <GlassCircleButton
          label="Expressions"
          sublabel="Expressions"
          size={52}
          onPress={() => router.push("/(tabs)/character")}
        >
          <Ionicons name="heart" size={21} color="#FFFFFF" />
        </GlassCircleButton>

        {/* Action 2: Sparkle Reaction (Primary action with electric blue halo) */}
        <GlassCircleButton
          label="Sparkle"
          size={58}
          selected
          onPress={handleSparkleHeroAction}
        >
          <Ionicons name="sparkles" size={23} color="#FFFFFF" />
        </GlassCircleButton>

        {/* Action 3: Lab & Sliders (Sliders icon) */}
        <GlassCircleButton
          label="Lab & Sliders"
          sublabel="Lab & Sliders"
          size={52}
          onPress={() => setStudioVisible(true)}
        >
          <Ionicons name="options-outline" size={21} color="#FFFFFF" />
        </GlassCircleButton>

        {/* Action 4: Nearby Radar */}
        <GlassCircleButton
          label="Nearby"
          sublabel={nearby.length ? `${nearby.length} Nearby` : "Nearby"}
          size={52}
          onPress={() => router.push("/(tabs)/drivers")}
        >
          <Ionicons name="radio-outline" size={21} color="#FFFFFF" />
        </GlassCircleButton>
      </View>

      {/* 4. Dynamic Narrative Status & Drag Instruction */}
      <View style={styles.narrativeSection}>
        <Text numberOfLines={1} style={styles.narrativeTitle}>
          {title}
        </Text>
        <View style={styles.glowingDivider} />
        <Text style={styles.dragInstruction}>DRAG TO INTERACT</Text>
      </View>

      {/* Character Studio / Lab Sliders Modal */}
      <CharacterStudioModal
        visible={studioVisible}
        onClose={() => setStudioVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "#FFFFFF",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusSubtext: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.70)",
    fontWeight: "500",
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studioPill: {
    backgroundColor: "rgba(56, 139, 255, 0.28)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  studioPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  mottoContainer: {
    alignSelf: "flex-end",
    marginRight: 4,
    marginTop: -4,
  },
  mottoText: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    fontWeight: "600",
    color: "rgba(240, 244, 252, 0.45)",
    textAlign: "right",
  },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 4,
  },
  moodRail: {
    position: "absolute",
    left: 2,
    top: 4,
    zIndex: 10,
    gap: 11,
  },
  moodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 2,
  },
  moodDotWrapper: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  moodActiveHalo: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#388BFF",
  },
  moodDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  moodLabel: {
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    marginTop: 2,
  },
  narrativeSection: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 6,
  },
  narrativeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  glowingDivider: {
    width: 42,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#388BFF",
    shadowColor: "#388BFF",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  dragInstruction: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.8,
    color: "rgba(240, 244, 252, 0.50)",
  },
});
