import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { Screen, Avatar, layout } from "../../components/ui/Kit";
import {
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
  const { width } = useWindowDimensions();
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

  // Dynamic preview size targeted at ~78-82% available width (280px for S22)
  const previewSize = Math.min(width * 0.78, 285);

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
      <View style={styles.homeContentWrapper}>
        {/* 1. Top Bar: CHERRIPI Title, Hardware Status, Studio Pill & Profile Avatar */}
        <View>
          <View style={layout.between}>
            <View style={{ gap: 2 }}>
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
              {/* Milky Translucent Glass Studio Pill */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Studio"
                onPress={() => {
                  feedback("tick");
                  router.push("/(tabs)/character");
                }}
                style={styles.studioPill}
              >
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.studioPillText}>Studio</Text>
              </Pressable>

              {/* User Profile Avatar with fine glass rim */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Your profile"
                onPress={() => router.push("/(tabs)/settings")}
                style={styles.avatarWrapper}
              >
                <Avatar name={profile.username} uri={profile.avatarUri} size={36} />
              </Pressable>
            </View>
          </View>

          {/* Atmospheric Brand Motto */}
          <View style={styles.mottoContainer}>
            <Text style={styles.mottoText}>A LITTLE COMPANY</Text>
            <Text style={styles.mottoText}>FOR WHEREVER YOU GO.</Text>
          </View>
        </View>

        {/* 2. Hero Centerpiece: Pure Integrated Cherri in Crystal Glass Orb */}
        <View style={styles.heroSection}>
          {/* Left Mood Rail (Vertical mood triggers with sharp active indicator) */}
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
                            : "rgba(255, 255, 255, 0.40)",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.moodLabel,
                      {
                        color: isActive ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)",
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

          {/* Pure Crystal Glass Bubble holding Integrated Draggable Cherri */}
          <GlassOrbFrame size={previewSize}>
            <CloudPreview
              size={previewSize}
              presentation="integrated"
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

          {/* Action 2: Sparkle Reaction (Primary action with refined soft halo) */}
          <GlassCircleButton
            label="Sparkle"
            size={58}
            selected
            onPress={handleSparkleHeroAction}
          >
            <Ionicons name="sparkles" size={23} color="#FFFFFF" />
          </GlassCircleButton>

          {/* Action 3: Lab & Sliders (Routes directly to /dev-lab) */}
          <GlassCircleButton
            label="Lab & Sliders"
            sublabel="Lab & Sliders"
            size={52}
            onPress={() => router.push("/dev-lab")}
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

        {/* 4. Dynamic Narrative Status & Drag Instruction (Safely above floating dock) */}
        <View style={styles.narrativeSection}>
          <Text numberOfLines={1} style={styles.narrativeTitle}>
            {title}
          </Text>
          <View style={styles.glowingDivider} />
          <Text style={styles.dragInstruction}>DRAG TO INTERACT</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeContentWrapper: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 78,
  },
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
    color: "rgba(240, 244, 252, 0.75)",
    fontWeight: "500",
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(100, 160, 255, 0.28)",
    borderColor: "rgba(255, 255, 255, 0.45)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#388BFF",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  studioPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  avatarWrapper: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.45)",
    borderRadius: 20,
    padding: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mottoContainer: {
    alignSelf: "flex-end",
    marginRight: 2,
    marginTop: -4,
  },
  mottoText: {
    fontSize: 8.8,
    letterSpacing: 1.4,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "right",
  },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 2,
  },
  moodRail: {
    position: "absolute",
    left: 4,
    top: 10,
    zIndex: 10,
    gap: 13,
  },
  moodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 2,
  },
  moodDotWrapper: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moodActiveHalo: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#388BFF",
  },
  moodDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moodLabel: {
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
  },
  narrativeSection: {
    alignItems: "center",
    gap: 5,
  },
  narrativeTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  glowingDivider: {
    width: 38,
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
    letterSpacing: 2.0,
    color: "rgba(255, 255, 255, 0.65)",
  },
});
