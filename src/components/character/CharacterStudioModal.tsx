import React, { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { CloudPreview } from "./CloudPreview";
import {
  CLOUD_SLIDERS,
  CLOUD_SLIDER_GROUPS,
  CloudSliderDef,
} from "../../domain/character/cloudSliders";
import { Copy, layout, Tap } from "../ui/Kit";
import { AtmosphericBackground } from "../ui/AtmosphericBackground";
import { GlassOrbFrame, GlassCard } from "../ui/Glass";

interface CharacterStudioModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CharacterStudioModal({
  visible,
  onClose,
}: CharacterStudioModalProps) {
  const feedback = useFeedback();
  const {
    profile,
    cloudSettings,
    updateCloudSettings,
    resetCloudSettings,
    activeBehaviourId,
    cloudEmotion,
    proximity,
  } = useAppStore();

  const [activeGroup, setActiveGroup] = useState<
    "params" | "colour" | "motion" | "trails" | "face"
  >("params");

  const slidersForGroup = CLOUD_SLIDERS.filter(
    (s) => s.group === activeGroup,
  );

  const getSliderValue = (slider: CloudSliderDef): number => {
    if (slider.group === "face") {
      return (cloudSettings.face as any)[slider.key] ?? slider.fallback;
    }
    return (
      (cloudSettings as any)[slider.group]?.[slider.key] ?? slider.fallback
    );
  };

  const adjustValue = (slider: CloudSliderDef, delta: number) => {
    feedback("tick");
    const current = getSliderValue(slider);
    const updated = Math.min(
      slider.max,
      Math.max(slider.min, Number((current + delta).toFixed(3))),
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <AtmosphericBackground variant="calm">
        <View style={{ flex: 1, backgroundColor: "transparent" }}>
          {/* Header Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <View>
              <Copy size={18} weight="700" style={{ letterSpacing: 0.5, color: "#FFFFFF" }}>
                Character Studio & Lab
              </Copy>
              <Copy size={12} muted>
                Live volumetric character & physics controls
              </Copy>
            </View>
            <Tap label="Close Studio" onPress={onClose}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </View>
            </Tap>
          </View>

          {/* Live Top Preview (Sticky) */}
          <View
            style={{
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.10)",
            }}
          >
            <GlassOrbFrame size={210}>
              <CloudPreview
                size={200}
                colourId={profile.characterColour}
                environment={profile.environment}
                emotion={cloudEmotion}
                behaviourId={activeBehaviourId ?? undefined}
                cloudSettings={cloudSettings}
                proximityState={proximity.state}
              />
            </GlassOrbFrame>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <Tap
                label="Reset Defaults"
                onPress={() => {
                  feedback("click");
                  resetCloudSettings();
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 14,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.16)",
                  }}
                >
                  <Copy size={11} weight="600" muted>
                    Reset Defaults
                  </Copy>
                </View>
              </Tap>
            </View>
          </View>

          {/* Group Filter Tabs */}
          <View style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {CLOUD_SLIDER_GROUPS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      feedback("tick");
                      setActiveGroup(g.id);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.08)",
                      borderWidth: 1,
                      borderColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.14)",
                    }}
                  >
                    <Copy
                      size={12}
                      weight={active ? "700" : "500"}
                      style={{ color: active ? "#ffffff" : "rgba(240, 244, 252, 0.75)" }}
                    >
                      {g.label}
                    </Copy>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Sliders List */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 40,
              gap: 14,
            }}
            showsVerticalScrollIndicator={false}
          >
            {slidersForGroup.map((slider) => {
              const val = getSliderValue(slider);
              const range = slider.max - slider.min;
              const pct = Math.max(
                0,
                Math.min(100, ((val - slider.min) / range) * 100),
              );
              const step = slider.step || (range > 10 ? 1 : 0.05);

              return (
                <GlassCard
                  key={slider.key}
                  style={{
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={layout.between}>
                    <Copy size={13} weight="600">
                      {slider.label}
                    </Copy>
                    <Copy size={12} weight="700" style={{ color: "#388BFF" }}>
                      {val.toFixed(slider.step >= 1 ? 0 : 2)}
                    </Copy>
                  </View>

                  {/* Visual Progress Bar */}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: "#388BFF",
                      }}
                    />
                  </View>

                  {/* Step Controls */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Copy size={10} muted>
                      min: {slider.min}
                    </Copy>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => adjustValue(slider, -step * 5)}
                        style={styles.stepBtn}
                      >
                        <Copy size={10} weight="600">
                          --
                        </Copy>
                      </Pressable>
                      <Pressable
                        onPress={() => adjustValue(slider, -step)}
                        style={styles.stepBtn}
                      >
                        <Copy size={14} weight="600">
                          -
                        </Copy>
                      </Pressable>
                      <Pressable
                        onPress={() => adjustValue(slider, step)}
                        style={styles.stepBtn}
                      >
                        <Copy size={14} weight="600">
                          +
                        </Copy>
                      </Pressable>
                      <Pressable
                        onPress={() => adjustValue(slider, step * 5)}
                        style={styles.stepBtn}
                      >
                        <Copy size={10} weight="600">
                          ++
                        </Copy>
                      </Pressable>
                    </View>
                    <Copy size={10} muted>
                      max: {slider.max}
                    </Copy>
                  </View>
                </GlassCard>
              );
            })}
          </ScrollView>
        </View>
      </AtmosphericBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stepBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
