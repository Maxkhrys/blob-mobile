import React, { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { CloudPreview } from "./CloudPreview";
import {
  CLOUD_SLIDERS,
  CLOUD_SLIDER_GROUPS,
  CloudSliderDef,
} from "../../domain/character/cloudSliders";
import { Copy, layout, Tap } from "../ui/Kit";

interface CharacterStudioModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CharacterStudioModal({
  visible,
  onClose,
}: CharacterStudioModalProps) {
  const c = useTheme();
  const feedback = useFeedback();
  const { width } = useWindowDimensions();
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
    (s) => s.group === activeGroup
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background }}>
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
            borderBottomColor: c.border,
          }}
        >
          <View>
            <Copy size={18} weight="700" style={{ letterSpacing: 0.5 }}>
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
                backgroundColor: c.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={c.text} />
            </View>
          </Tap>
        </View>

        {/* Live Top Preview (Sticky) */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 14,
            backgroundColor: c.background,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          <CloudPreview
            size={Math.min(width - 64, 230)}
            colourId={profile.characterColour}
            environment={profile.environment}
            emotion={cloudEmotion}
            behaviourId={activeBehaviourId ?? undefined}
            cloudSettings={cloudSettings}
            proximityState={proximity.state}
          />
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
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
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
                    backgroundColor: active ? c.accent : c.surface,
                    borderWidth: 1,
                    borderColor: active ? c.accent : c.border,
                  }}
                >
                  <Copy
                    size={12}
                    weight={active ? "700" : "500"}
                    style={{ color: active ? "#ffffff" : c.text }}
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
              Math.min(100, ((val - slider.min) / range) * 100)
            );
            const step = slider.step || (range > 10 ? 1 : 0.05);

            return (
              <View
                key={slider.key}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  gap: 10,
                }}
              >
                <View style={layout.between}>
                  <Copy size={13} weight="600">
                    {slider.label}
                  </Copy>
                  <Copy size={12} weight="700" style={{ color: c.accent }}>
                    {val.toFixed(slider.step >= 1 ? 0 : 2)}
                  </Copy>
                </View>

                {/* Visual Progress Bar */}
                <View
                  style={{
                    height: 6,
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
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stepBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
