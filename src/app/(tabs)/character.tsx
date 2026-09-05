import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, ScrollView, TextInput, Pressable, useWindowDimensions, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { ColourSwatchPicker } from "../../components/character/ColourSwatchPicker";
import { EnvironmentPicker } from "../../components/character/EnvironmentPicker";
import { SliderControl } from "../../components/common/SliderControl";
import {
  Screen,
  Section,
  Copy,
  Field,
  Tap,
  Surface,
  layout,
} from "../../components/ui/Kit";
import {
  EXPRESSION_FILTERS,
  ALL_BEHAVIOURS,
  ExpressionCategory,
} from "../../domain/expressions/catalog";
import {
  CLOUD_SLIDERS,
  CLOUD_SLIDER_GROUPS,
  CloudSliderDef,
} from "../../domain/character/cloudSliders";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

export default function CharacterScreen() {
  const {
    profile,
    updateProfile,
    device,
    setDeviceBrightness,
    cloudSettings,
    updateCloudSettings,
    resetCloudSettings,
    triggerBehaviour,
    activeBehaviourId,
  } = useAppStore();
  const c = useTheme();
  const feedback = useFeedback();
  const { width } = useWindowDimensions();

  const [panel, setPanel] = useState<"look" | "behaviours" | "lab">("look");
  const [selectedFilter, setSelectedFilter] = useState<ExpressionCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReactionToken, setActiveReactionToken] = useState(0);
  const [playingId, setPlayingId] = useState<string>("");

  const [activeLabGroup, setActiveLabGroup] = useState<
    "params" | "colour" | "motion" | "trails" | "face"
  >("params");

  const [presetName, setPresetName] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const trigger = (id: string) => {
    feedback("tick");
    if (timer.current) clearTimeout(timer.current);
    setPlayingId(id);
    setActiveReactionToken((t) => t + 1);
    triggerBehaviour(id);
    timer.current = setTimeout(() => setPlayingId(""), 2400);
  };

  const filteredBehaviours = useMemo(() => {
    let list =
      selectedFilter === "ALL"
        ? ALL_BEHAVIOURS
        : ALL_BEHAVIOURS.filter((b) => b.category === selectedFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.label.toLowerCase().includes(q) ||
          b.hint.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedFilter, searchQuery]);

  const labSliders = useMemo(
    () => CLOUD_SLIDERS.filter((s) => s.group === activeLabGroup),
    [activeLabGroup]
  );

  const getSliderVal = (slider: CloudSliderDef): number => {
    if (slider.group === "face") {
      return (cloudSettings.face as any)[slider.key] ?? slider.fallback;
    }
    return (
      (cloudSettings as any)[slider.group]?.[slider.key] ?? slider.fallback
    );
  };

  const adjustSliderVal = (slider: CloudSliderDef, delta: number) => {
    feedback("tick");
    const current = getSliderVal(slider);
    const updated = Math.min(
      slider.max,
      Math.max(slider.min, Number((current + delta).toFixed(3)))
    );
    if (slider.group === "face") {
      updateCloudSettings({
        face: {
          ...cloudSettings.face,
          [slider.key]: updated,
        },
      });
    } else {
      updateCloudSettings({
        [slider.group]: {
          ...(cloudSettings as any)[slider.group],
          [slider.key]: updated,
        },
      });
    }
  };

  return (
    <Screen
      header={
        <>
          <View style={layout.between}>
            <Copy size={20} weight="700">
              Cherri Studio
            </Copy>
            {playingId ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  backgroundColor: c.accent,
                }}
              >
                <Copy size={10} weight="700" style={{ color: "#ffffff" }}>
                  {playingId}
                </Copy>
              </View>
            ) : null}
          </View>

          {/* Top Live Display with Touch/Drag */}
          <View style={{ alignItems: "center" }}>
            <CloudPreview
              size={Math.min(width - 64, 226)}
              colourId={profile.characterColour}
              environment={profile.environment}
              behaviourId={playingId || activeBehaviourId || undefined}
              reactionToken={activeReactionToken}
              cloudSettings={cloudSettings}
            />
          </View>

          {/* Three Mode Segment Tabs */}
          <View
            style={[
              layout.row,
              {
                backgroundColor: c.backgroundSecondary,
                borderRadius: 16,
                padding: 4,
              },
            ]}
          >
            {(["look", "behaviours", "lab"] as const).map((p) => {
              const label =
                p === "look"
                  ? "Customize"
                  : p === "behaviours"
                  ? `Actions (${ALL_BEHAVIOURS.length})`
                  : "Lab Sliders";
              const active = panel === p;
              return (
                <Tap
                  key={p}
                  label={label}
                  selected={active}
                  onPress={() => {
                    feedback("tick");
                    setPanel(p);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor: active ? c.surface : "transparent",
                    paddingVertical: 8,
                  }}
                >
                  <Copy
                    weight={active ? "700" : "500"}
                    size={12}
                    style={{ textAlign: "center" }}
                  >
                    {label}
                  </Copy>
                </Tap>
              );
            })}
          </View>
        </>
      }
    >
      {panel === "look" ? (
        <>
          <Field
            label="Cherri name"
            value={profile.characterName}
            onChangeText={(characterName) => updateProfile({ characterName })}
            placeholder="Cherri"
          />
          <Section title="Colour Preset">
            <ColourSwatchPicker
              selectedColour={profile.characterColour}
              onSelectColour={(characterColour) =>
                updateProfile({ characterColour })
              }
            />
          </Section>
          <Section title="Environment Mode">
            <EnvironmentPicker
              selectedEnvironment={profile.environment}
              onSelectEnvironment={(environment) =>
                updateProfile({ environment })
              }
            />
          </Section>
          <Surface>
            <SliderControl
              value={device.brightness}
              onChange={setDeviceBrightness}
            />
          </Surface>
          <Section title="Saved Looks">
            <Copy muted size={13}>
              Save your favourite combination of colour and scene.
            </Copy>
            <Field
              label="Look name"
              value={presetName}
              onChangeText={(t) => {
                setPresetName(t);
                setSaved(false);
              }}
              placeholder="Midnight Velvet"
            />
            <Tap
              label="Save this look"
              disabled={!presetName.trim() || profile.savedPresets.length >= 20}
              onPress={() => {
                feedback("click");
                void updateProfile({
                  savedPresets: [
                    ...profile.savedPresets,
                    {
                      id: `look-${Date.now()}`,
                      name: presetName.trim(),
                      colourId: profile.characterColour,
                      environment: profile.environment,
                    },
                  ],
                });
                setPresetName("");
                setSaved(true);
              }}
            >
              <Copy weight="600" style={{ color: c.accent }}>
                {saved ? "Look saved" : "Save this look"}
              </Copy>
            </Tap>
            {profile.savedPresets.map((p) => (
              <View key={p.id} style={layout.between}>
                <Tap
                  label={`Apply ${p.name}`}
                  onPress={() => {
                    feedback("tick");
                    updateProfile({
                      characterColour: p.colourId,
                      environment: p.environment,
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  <Copy>{p.name}</Copy>
                </Tap>
                <Tap
                  label={`Delete ${p.name}`}
                  onPress={() =>
                    updateProfile({
                      savedPresets: profile.savedPresets.filter(
                        (x) => x.id !== p.id
                      ),
                    })
                  }
                >
                  <Copy muted size={13}>
                    Remove
                  </Copy>
                </Tap>
              </View>
            ))}
          </Section>
        </>
      ) : panel === "behaviours" ? (
        <View style={{ gap: 14 }}>
          {/* Search input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.surface,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Ionicons name="search" size={16} color={c.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search 80+ behaviours..."
              placeholderTextColor={c.textSecondary}
              style={{ flex: 1, color: c.text, fontSize: 13 }}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={c.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {EXPRESSION_FILTERS.map((cat) => {
              const active = selectedFilter === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    feedback("tick");
                    setSelectedFilter(cat);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: active ? c.accent : c.surface,
                    borderWidth: 1,
                    borderColor: active ? c.accent : c.border,
                  }}
                >
                  <Copy
                    size={11}
                    weight={active ? "700" : "500"}
                    style={{ color: active ? "#ffffff" : c.text }}
                  >
                    {cat}
                  </Copy>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Behaviours Grid */}
          <View style={layout.wrap}>
            {filteredBehaviours.map((b) => {
              const isPlaying = playingId === b.id;
              return (
                <Tap
                  key={b.id}
                  label={`Play ${b.label}`}
                  selected={isPlaying}
                  onPress={() => trigger(b.id)}
                  style={{
                    width: "48%",
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: isPlaying ? c.accentMuted : c.surface,
                    borderWidth: 1,
                    borderColor: isPlaying ? c.accent : c.border,
                    gap: 4,
                  }}
                >
                  <View style={layout.between}>
                    <Copy size={13} weight="600" numberOfLines={1}>
                      {b.label}
                    </Copy>
                    <View
                      style={{
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isPlaying ? c.accent : c.backgroundSecondary,
                      }}
                    >
                      <Copy
                        size={9}
                        weight="700"
                        style={{ color: isPlaying ? "#ffffff" : c.textSecondary }}
                      >
                        {b.category}
                      </Copy>
                    </View>
                  </View>
                  <Copy muted size={11} numberOfLines={1}>
                    {b.hint}
                  </Copy>
                </Tap>
              );
            })}
          </View>
        </View>
      ) : (
        /* Character Lab Sliders Panel */
        <View style={{ gap: 14 }}>
          <View style={layout.between}>
            <Copy size={13} muted>
              Edit all 30+ volumetric parameters in real-time
            </Copy>
            <Tap
              label="Reset Defaults"
              onPress={() => {
                feedback("click");
                resetCloudSettings();
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Copy size={11} weight="600" style={{ color: c.accent }}>
                  Reset Defaults
                </Copy>
              </View>
            </Tap>
          </View>

          {/* Lab Group Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {CLOUD_SLIDER_GROUPS.map((g) => {
              const active = activeLabGroup === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    feedback("tick");
                    setActiveLabGroup(g.id);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: active ? c.accent : c.surface,
                    borderWidth: 1,
                    borderColor: active ? c.accent : c.border,
                  }}
                >
                  <Copy
                    size={11}
                    weight={active ? "700" : "500"}
                    style={{ color: active ? "#ffffff" : c.text }}
                  >
                    {g.label}
                  </Copy>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Lab Sliders */}
          <View style={{ gap: 10 }}>
            {labSliders.map((slider) => {
              const val = getSliderVal(slider);
              const range = slider.max - slider.min;
              const pct = Math.max(
                0,
                Math.min(100, ((val - slider.min) / range) * 100)
              );
              const step = slider.step || (range > 10 ? 1 : 0.05);

              return (
                <View
                  key={slider.key}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    gap: 8,
                  }}
                >
                  <View style={layout.between}>
                    <Copy size={12} weight="600">
                      {slider.label}
                    </Copy>
                    <Copy size={12} weight="700" style={{ color: c.accent }}>
                      {val.toFixed(slider.step >= 1 ? 0 : 2)}
                    </Copy>
                  </View>

                  {/* Progress track */}
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: c.border,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: c.accent,
                      }}
                    />
                  </View>

                  {/* Steppers */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Copy size={10} muted>
                      {slider.min}
                    </Copy>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        onPress={() => adjustSliderVal(slider, -step)}
                        style={styles.stepBtn}
                      >
                        <Copy size={13} weight="600">
                          -
                        </Copy>
                      </Pressable>
                      <Pressable
                        onPress={() => adjustSliderVal(slider, step)}
                        style={styles.stepBtn}
                      >
                        <Copy size={13} weight="600">
                          +
                        </Copy>
                      </Pressable>
                    </View>
                    <Copy size={10} muted>
                      {slider.max}
                    </Copy>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepBtn: {
    width: 34,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
});
