import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { ColourSwatchPicker } from "../../components/character/ColourSwatchPicker";
import { EnvironmentPicker } from "../../components/character/EnvironmentPicker";
import { Screen } from "../../components/ui/Kit";
import { CherriThumbnail } from "../../components/character/CherriThumbnail";
import {
  GlassSurface,
  GlassCard,
  GlassCircleButton,
  GlassSegmentedControl,
  GlowButton,
} from "../../components/ui/Glass";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import {
  ALL_BEHAVIOURS,
  ExpressionCategory,
} from "../../domain/expressions/catalog";
import { CloudColourId } from "../../types";

type StudioTab = "expressions" | "colours" | "behaviour";
type MoodChip = "Calm" | "Happy" | "Curious" | "Sleepy" | "Focused";

const MOOD_CHIPS: readonly { label: MoodChip; category: ExpressionCategory; defaultId: string; desc: string }[] = [
  { label: "Calm", category: "Idle", defaultId: "FLOAT_DRIFT", desc: "Content and relaxed." },
  { label: "Happy", category: "Emotion", defaultId: "HAPPY_BOUNCE", desc: "Joyful and bouncy." },
  { label: "Curious", category: "Action", defaultId: "CURIOUS_DOUBLE_TAKE", desc: "Observant and alert." },
  { label: "Sleepy", category: "Action", defaultId: "SLEEPY_YAWN", desc: "Drowsy and cozy." },
  { label: "Focused", category: "Emotion", defaultId: "NOD_YES", desc: "Attentive and steady." },
];

export default function CharacterScreen() {
  const {
    profile,
    updateProfile,
    device,
    setDeviceBrightness,
    cloudSettings,
    updateCloudSettings,
    triggerBehaviour,
    activeBehaviourId,
  } = useAppStore();

  const router = useRouter();
  const feedback = useFeedback();
  const { width } = useWindowDimensions();

  const [currentTab, setCurrentTab] = useState<StudioTab>("expressions");
  const [selectedMood, setSelectedMood] = useState<MoodChip>("Calm");
  const [activeExprIndex, setActiveExprIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string>("");
  const [animationSpeed, setAnimationSpeed] = useState<"Normal" | "Energetic" | "Gentle">("Normal");
  const [intensity, setIntensity] = useState(device.brightness ?? 92);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Filter behaviours for active mood
  const currentMoodMeta = useMemo(
    () => MOOD_CHIPS.find((m) => m.label === selectedMood) || MOOD_CHIPS[0],
    [selectedMood],
  );

  const moodBehaviours = useMemo(() => {
    const list = ALL_BEHAVIOURS.filter(
      (b) => b.category === currentMoodMeta.category || b.id === currentMoodMeta.defaultId,
    );
    return list.length ? list : ALL_BEHAVIOURS.slice(0, 8);
  }, [currentMoodMeta]);

  const activeExpression = moodBehaviours[activeExprIndex] || moodBehaviours[0];

  const handleTriggerExpression = (id?: string) => {
    const targetId = id || activeExpression?.id || "FLOAT_DRIFT";
    feedback("click");
    if (timer.current) clearTimeout(timer.current);
    setPlayingId(targetId);
    triggerBehaviour(targetId);
    timer.current = setTimeout(() => setPlayingId(""), 2500);
  };

  const handlePrevExpression = () => {
    feedback("tick");
    const nextIdx = activeExprIndex > 0 ? activeExprIndex - 1 : moodBehaviours.length - 1;
    setActiveExprIndex(nextIdx);
    handleTriggerExpression(moodBehaviours[nextIdx]?.id);
  };

  const handleNextExpression = () => {
    feedback("tick");
    const nextIdx = activeExprIndex < moodBehaviours.length - 1 ? activeExprIndex + 1 : 0;
    setActiveExprIndex(nextIdx);
    handleTriggerExpression(moodBehaviours[nextIdx]?.id);
  };

  // Explicit absolute animation speed configuration (prevents compounding mutation)
  const cycleSpeed = () => {
    feedback("tick");
    const next =
      animationSpeed === "Normal"
        ? "Energetic"
        : animationSpeed === "Energetic"
          ? "Gentle"
          : "Normal";
    setAnimationSpeed(next);

    const speedPresets = {
      Gentle: { floatAmount: 2.8, driftAmount: 1.8, floatSpeed: 0.0004 },
      Normal: { floatAmount: 4.5, driftAmount: 2.5, floatSpeed: 0.0008 },
      Energetic: { floatAmount: 6.2, driftAmount: 3.6, floatSpeed: 0.0013 },
    };

    updateCloudSettings({
      motion: {
        ...cloudSettings.motion,
        ...speedPresets[next],
      },
    });
  };

  const handleIntensityChange = (val: number) => {
    const rounded = Math.round(val);
    setIntensity(rounded);
    setDeviceBrightness(rounded);
  };

  // Generous size for Cherri in Studio preview
  const previewSize = Math.min(width - 70, 230);

  return (
    <Screen scrollable variant="calm" contentPaddingBottom={155}>
      {/* 1. Sheet Header with Grabber, Title, Subtitle, and Close Button */}
      <View style={styles.sheetHeader}>
        <View style={styles.grabber} />
        <View style={styles.headerTitleRow}>
          <View style={{ gap: 2 }}>
            <Text style={styles.screenTitle}>Cherri</Text>
            <Text style={styles.screenSubtitle}>
              Edit mood, appearance and behaviour.
            </Text>
          </View>
          <GlassCircleButton
            label="Close"
            size={36}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </GlassCircleButton>
        </View>
      </View>

      {/* 2. Main Segmented Control: Expressions | Colours | Behaviour */}
      <GlassSegmentedControl
        selected={currentTab}
        onSelect={(tab) => setCurrentTab(tab)}
        items={[
          { id: "expressions", label: "Expressions" },
          { id: "colours", label: "Colours" },
          { id: "behaviour", label: "Behaviour" },
        ]}
        renderIcon={(tab, isSelected) => {
          const color = isSelected ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)";
          if (tab === "expressions") {
            return <Ionicons name="sparkles" size={15} color={color} />;
          }
          if (tab === "colours") {
            return <Ionicons name="color-palette-outline" size={15} color={color} />;
          }
          return <Ionicons name="options-outline" size={15} color={color} />;
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXPRESSIONS (Matches Right Side Reference)             */}
      {/* ------------------------------------------------------------- */}
      {currentTab === "expressions" && (
        <View style={{ gap: 14 }}>
          {/* Mood Filter Capsules (Translucent glass - no flat solid fill) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodChipsScroll}
          >
            {MOOD_CHIPS.map((chip) => {
              const isSelected = selectedMood === chip.label;
              return (
                <Pressable
                  key={chip.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    feedback("tick");
                    setSelectedMood(chip.label);
                    setActiveExprIndex(0);
                    handleTriggerExpression(chip.defaultId);
                  }}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: isSelected
                        ? "rgba(56, 139, 255, 0.28)"
                        : "rgba(255, 255, 255, 0.08)",
                      borderColor: isSelected
                        ? "#388BFF"
                        : "rgba(255, 255, 255, 0.18)",
                      shadowColor: isSelected ? "#388BFF" : "transparent",
                      shadowOpacity: isSelected ? 0.45 : 0,
                      shadowRadius: isSelected ? 8 : 0,
                      elevation: isSelected ? 3 : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moodChipText,
                      {
                        color: isSelected ? "#FFFFFF" : "rgba(240, 244, 252, 0.70)",
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Barely-There Frosted Glass Sheet with Integrated Live Draggable Cherri */}
          <GlassCard style={styles.previewCard}>
            <View style={styles.previewCardInner}>
              <GlassCircleButton
                label="Previous expression"
                size={38}
                onPress={handlePrevExpression}
              >
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </GlassCircleButton>

              <View style={{ alignItems: "center" }}>
                <CloudPreview
                  size={previewSize}
                  presentation="integrated"
                  colourId={profile.characterColour}
                  environment={profile.environment}
                  behaviourId={playingId || activeBehaviourId || activeExpression?.id}
                  cloudSettings={cloudSettings}
                  interactive={true}
                />
              </View>

              <GlassCircleButton
                label="Next expression"
                size={38}
                onPress={handleNextExpression}
              >
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </GlassCircleButton>
            </View>

            {/* Expression Name & Description */}
            <View style={{ alignItems: "center", gap: 3, marginTop: 4 }}>
              <Text style={styles.expressionTitle}>
                {activeExpression?.label || selectedMood}
              </Text>
              <Text style={styles.expressionDescription}>
                {activeExpression?.hint || currentMoodMeta.desc}
              </Text>
            </View>
          </GlassCard>

          {/* Mini Cherri Cloud Expression Thumbnails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.expressionStripScroll}
          >
            {moodBehaviours.map((item, idx) => {
              const isSelected = idx === activeExprIndex;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    feedback("tick");
                    setActiveExprIndex(idx);
                    handleTriggerExpression(item.id);
                  }}
                  style={[
                    styles.miniCard,
                    {
                      borderColor: isSelected
                        ? "#388BFF"
                        : "rgba(255, 255, 255, 0.16)",
                      backgroundColor: isSelected
                        ? "rgba(56, 139, 255, 0.22)"
                        : "rgba(255, 255, 255, 0.07)",
                      shadowColor: isSelected ? "#388BFF" : "transparent",
                      shadowOpacity: isSelected ? 0.45 : 0,
                      shadowRadius: isSelected ? 8 : 0,
                      elevation: isSelected ? 3 : 0,
                    },
                  ]}
                >
                  <CherriThumbnail
                    expressionId={item.id}
                    size={40}
                    selected={isSelected}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.miniCardText,
                      {
                        color: isSelected ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)",
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Display Brightness Slider (Direct hardware backlight mapping) */}
          <GlassSurface style={styles.controlRowCard}>
            <View style={styles.controlRowHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name="sunny"
                  size={16}
                  color="rgba(255, 255, 255, 0.85)"
                />
                <Text style={styles.controlRowLabel}>Display Brightness</Text>
              </View>
              <Text style={styles.controlRowValue}>{intensity}%</Text>
            </View>
            <View style={styles.sliderWrapper}>
              <Slider
                style={{ flex: 1, height: 32 }}
                minimumValue={10}
                maximumValue={100}
                value={intensity}
                onValueChange={handleIntensityChange}
                minimumTrackTintColor="#388BFF"
                maximumTrackTintColor="rgba(255, 255, 255, 0.18)"
                thumbTintColor="#FFFFFF"
              />
            </View>
          </GlassSurface>

          {/* Animation Speed Selector Card */}
          <GlassSurface style={styles.controlRowCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Animation speed: ${animationSpeed}`}
              onPress={cycleSpeed}
              style={styles.speedRowPressable}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.speedIconBox}>
                  <Ionicons name="pulse-outline" size={17} color="#FFFFFF" />
                </View>
                <Text style={styles.controlRowLabel}>Animation Speed</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.controlRowValue}>{animationSpeed}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="rgba(240, 244, 252, 0.45)"
                />
              </View>
            </Pressable>
          </GlassSurface>

          {/* Large Bottom Action: Preview Mood / Replay Expression */}
          <GlowButton
            title="Preview Mood"
            icon={<Ionicons name="play" size={17} color="#FFFFFF" />}
            onPress={() => handleTriggerExpression()}
            style={{ marginTop: 6 }}
          />
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: COLOURS & ENVIRONMENT                                 */}
      {/* ------------------------------------------------------------- */}
      {currentTab === "colours" && (
        <View style={{ gap: 18 }}>
          <GlassCard>
            <Text style={styles.sectionHeader}>Cloud Palette</Text>
            <ColourSwatchPicker
              value={profile.characterColour}
              onChange={(col: CloudColourId) => {
                feedback("tick");
                updateProfile({ characterColour: col });
              }}
            />
          </GlassCard>

          <GlassCard>
            <Text style={styles.sectionHeader}>Environment Backdrop</Text>
            <EnvironmentPicker
              value={profile.environment}
              onChange={(env) => {
                feedback("tick");
                updateProfile({ environment: env });
              }}
            />
          </GlassCard>
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BEHAVIOUR & DEV LAB SHORTCUT                          */}
      {/* ------------------------------------------------------------- */}
      {currentTab === "behaviour" && (
        <View style={{ gap: 16 }}>
          <GlassCard>
            <Text style={styles.sectionHeader}>Liveliness & Presence</Text>

            {/* Float & Bobbing */}
            <View style={styles.behaviourRow}>
              <Text style={styles.behaviourLabel}>Float Drift</Text>
              <Pressable
                onPress={() => {
                  feedback("tick");
                  updateCloudSettings({
                    motion: {
                      ...cloudSettings.motion,
                      driftSpeed: (cloudSettings.motion?.driftSpeed ?? 0.00035) * 1.25,
                    },
                  });
                }}
                style={styles.actionChip}
              >
                <Text style={styles.actionChipText}>Enhance</Text>
              </Pressable>
            </View>

            {/* Cloud Fluffiness */}
            <View style={styles.behaviourRow}>
              <Text style={styles.behaviourLabel}>Fluffiness</Text>
              <Pressable
                onPress={() => {
                  feedback("tick");
                  const current = cloudSettings.params?.fluffiness ?? 1.05;
                  updateCloudSettings({
                    params: {
                      ...cloudSettings.params,
                      fluffiness: current >= 1.2 ? 0.85 : current + 0.15,
                    },
                  });
                }}
                style={styles.actionChip}
              >
                <Text style={styles.actionChipText}>Toggle</Text>
              </Pressable>
            </View>

            {/* Mist Trails */}
            <View style={styles.behaviourRow}>
              <Text style={styles.behaviourLabel}>Mist Atmosphere</Text>
              <Pressable
                onPress={() => {
                  feedback("tick");
                  const cur = cloudSettings.trails?.trailStrength ?? 0.6;
                  updateCloudSettings({
                    trails: {
                      ...cloudSettings.trails,
                      trailStrength: cur > 0.8 ? 0.3 : 0.9,
                    },
                  });
                }}
                style={styles.actionChip}
              >
                <Text style={styles.actionChipText}>Cycle</Text>
              </Pressable>
            </View>
          </GlassCard>

          {/* Dev Lab Entry Button */}
          <GlassCard style={{ alignItems: "center", gap: 10 }}>
            <Text style={styles.devNoticeTitle}>Need Advanced Tuning?</Text>
            <Text style={styles.devNoticeDesc}>
              Physics springs, 3D turn kinematics, performance clips, and raw telemetry are in Dev Lab.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Advanced Dev Lab"
              onPress={() => {
                feedback("click");
                router.push("/dev-lab");
              }}
              style={styles.devLabButton}
            >
              <Ionicons name="terminal-outline" size={17} color="#FFFFFF" />
              <Text style={styles.devLabButtonText}>Open Advanced Dev Lab</Text>
            </Pressable>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    gap: 12,
    marginBottom: 6,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
    alignSelf: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
  },
  moodChipsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  moodChipText: {
    fontSize: 13,
  },
  previewCard: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  previewCardInner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expressionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  expressionDescription: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.55)",
  },
  expressionStripScroll: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  miniCard: {
    width: 78,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 6,
  },
  miniCardText: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  controlRowCard: {
    padding: 14,
    gap: 10,
  },
  controlRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  controlRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#388BFF",
  },
  sliderWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  speedRowPressable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  speedIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  behaviourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  behaviourLabel: {
    fontSize: 14,
    color: "rgba(240, 244, 252, 0.85)",
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(56, 139, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(56, 139, 255, 0.45)",
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#388BFF",
  },
  devNoticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  devNoticeDesc: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.60)",
    textAlign: "center",
    lineHeight: 18,
  },
  devLabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    marginTop: 4,
  },
  devLabButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
