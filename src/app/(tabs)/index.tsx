import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import {
  CharacterToolMenu,
  MoodPreset,
} from "../../components/character/CharacterToolMenu";
import { Screen, Avatar, layout } from "../../components/ui/Kit";
import {
  GlassOrbFrame,
  StatusDot,
} from "../../components/ui/Glass";
import { narrative } from "../../components/home/narrative";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

export default function HomeScreen() {
  const {
    profile,
    updateProfile,
    device,
    proximity,
    cloudEmotion,
    triggerEmotion,
    activeBehaviourId,
    triggerBehaviour,
    cloudSettings,
  } = useAppStore();

  const router = useRouter();
  const feedback = useFeedback();
  const { width, height } = useWindowDimensions();
  const [selectedMood, setSelectedMood] = useState<string>("CALM");
  const [menuOpen, setMenuOpen] = useState(false);

  const name = proximity.driverName || "Your friend";
  const [title] = narrative(
    proximity.state,
    name,
    profile.characterName || "Your Cherri",
  );

  // Dynamic preview size targeted at ~84-88% available width with user scale factor
  const basePreviewSize = Math.min(width * 0.86, height * 0.42, 340);
  const playScale = profile.homePlayAreaScale ?? 1.0;
  const previewSize = Math.round(Math.min(basePreviewSize * playScale, width - 24));

  const handleMoodSelect = (mood: MoodPreset) => {
    feedback("tick");
    setSelectedMood(mood.id);
    triggerEmotion(mood.emotion);
    triggerBehaviour(mood.behaviour);
  };

  return (
    <Screen scrollable={false} variant="home" environment={profile.environment}>
      {/* 0. Fullscreen Backdrop Dismiss: intercepts taps outside Cherri and outside tool buttons */}
      {menuOpen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss tool menu"
          onPress={() => {
            feedback("tick");
            setMenuOpen(false);
          }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.homeContentWrapper} pointerEvents="box-none">
        {/* 1. Top Bar: CHERRIPI Title, Hardware Status, Milky Studio Pill & Profile Avatar */}
        <View pointerEvents="box-none">
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

              {/* User Profile Avatar with fine translucent glass rim */}
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

        {/* 2. Hero Centerpiece: Dedicated Interaction Stage for Glass Orb + Liquid Tool Menu */}
        <View style={styles.heroSection} pointerEvents="box-none">
          <View
            style={[
              styles.interactionStage,
              { width: previewSize, height: previewSize },
            ]}
            pointerEvents="box-none"
          >
            {/* Optical Glass Lens Sphere holding Live Interactive Cherri */}
            <GlassOrbFrame size={previewSize} environment={profile.environment}>
              <CloudPreview
                size={previewSize}
                characterScale={0.68}
                presentation="integrated"
                colourId={profile.characterColour}
                environment={profile.environment}
                emotion={cloudEmotion}
                behaviourId={activeBehaviourId ?? undefined}
                cloudSettings={cloudSettings}
                proximityState={proximity.state}
                onDoubleTap={() => {
                  feedback("success");
                  setMenuOpen((v) => !v);
                }}
                onTap={() => {
                  if (menuOpen) {
                    feedback("tick");
                    setMenuOpen(false);
                  }
                }}
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

            {/* Character Halo Tool Menu (buttons stay anchored to stage, not chasing Cherri) */}
            <CharacterToolMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              stageSize={previewSize}
              colourId={profile.characterColour}
              onColourChange={(col) => updateProfile({ characterColour: col })}
              environment={profile.environment}
              onEnvironmentChange={(env) => updateProfile({ environment: env })}
              onTriggerExpression={(exprId) => triggerBehaviour(exprId)}
              currentMoodId={selectedMood}
              onMoodSelect={handleMoodSelect}
            />
          </View>
        </View>

        {/* 3. Dynamic Narrative Status & Drag Instruction (Safely above floating dock) */}
        <View style={styles.narrativeSection} pointerEvents="box-none">
          <View style={styles.narrativeHeaderRow} pointerEvents="box-none">
            <Text numberOfLines={1} style={styles.narrativeTitle}>
              {title}
            </Text>
            <View style={styles.moodStatusBadge}>
              <View style={styles.moodStatusDot} />
              <Text style={styles.moodStatusText}>{selectedMood}</Text>
            </View>
          </View>
          <View style={styles.glowingDivider} />
          <Text style={styles.dragInstruction}>
            {menuOpen
              ? "TAP CHERRI OR OUTSIDE TO CLOSE"
              : "DOUBLE TAP TO CUSTOMIZE · DRAG TO PLAY"}
          </Text>
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
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  studioPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  avatarWrapper: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.30)",
    borderRadius: 20,
    padding: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  interactionStage: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  narrativeSection: {
    alignItems: "center",
    gap: 5,
  },
  narrativeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  narrativeTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  moodStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  moodStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#388BFF",
  },
  moodStatusText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "rgba(255, 255, 255, 0.90)",
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
