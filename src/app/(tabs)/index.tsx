import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { CharacterStudioModal } from "../../components/character/CharacterStudioModal";
import { Screen, Copy, Tap, Avatar, layout } from "../../components/ui/Kit";
import { useTheme } from "../../constants/theme";
import { narrative } from "../../components/home/narrative";
import { getStateMeta } from "../../domain/productStates/stateEmotionMap";

export default function HomeScreen() {
  const {
    profile,
    device,
    proximity,
    cloudEmotion,
    activeBehaviourId,
    cloudSettings,
    drivers,
  } = useAppStore();
  const router = useRouter();
  const c = useTheme();
  const { width, height } = useWindowDimensions();
  const [studioVisible, setStudioVisible] = useState(false);

  const name = proximity.driverName || "Your friend";
  const [title, sub] = narrative(
    proximity.state,
    name,
    profile.characterName || "Your Cherri",
  );
  const nearby = drivers.filter((d) =>
    ["Nearby", "Approaching", "Very close", "Together"].includes(d.status),
  );

  // Measure preview diameter so it fits screen height perfectly without overflow
  const previewSize = Math.min(width - 64, height * 0.38, 296);

  return (
    <Screen scrollable={false}>
      {/* Top Brand & Hardware Status Bar */}
      <View style={layout.between}>
        <View style={{ gap: 2 }}>
          <Copy size={19} weight="800" style={{ letterSpacing: 2 }}>
            CHERRIPI
          </Copy>
          <View style={[layout.row, { gap: 6 }]}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  device.state === "Connected" ? c.success : c.warning,
              }}
            />
            <Copy size={11} muted>
              {device.state === "Connected" ? "Active" : device.state} •{" "}
              {device.battery}%
            </Copy>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Quick Character Studio Launcher */}
          <Tap label="Open Character Studio" onPress={() => setStudioVisible(true)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Ionicons name="color-wand-outline" size={15} color={c.accent} />
              <Copy size={11} weight="600" style={{ color: c.accent }}>
                Studio
              </Copy>
            </View>
          </Tap>

          <Tap
            label="Your profile"
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Avatar name={profile.username} uri={profile.avatarUri} size={38} />
          </Tap>
        </View>
      </View>

      {/* Hero Physical Display Ring */}
      <View style={{ alignItems: "center", justifyContent: "center", gap: 10 }}>
        <CloudPreview
          size={previewSize}
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
        <Copy size={10} muted weight="600" style={{ letterSpacing: 1.2 }}>
          466 × 466 AMOLED • DRAG TO INTERACT
        </Copy>
      </View>

      {/* Narrative Status Card */}
      <View style={{ gap: 4, alignItems: "center", paddingHorizontal: 16 }}>
        <Copy
          size={24}
          weight="600"
          style={{
            textAlign: "center",
            letterSpacing: -0.4,
            color:
              proximity.state === "HOME"
                ? c.text
                : getStateMeta(proximity.state).accent,
          }}
        >
          {title}
        </Copy>
        <Copy
          size={13}
          muted
          style={{ textAlign: "center", maxWidth: 300, lineHeight: 18 }}
        >
          {sub}
        </Copy>
      </View>

      {/* Quick Actions Dock */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          backgroundColor: c.surface,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Tap
          label="All Behaviours & Expressions"
          onPress={() => router.push("/(tabs)/character")}
        >
          <View style={{ alignItems: "center", gap: 4, minWidth: 80 }}>
            <Ionicons name="sparkles" size={20} color={c.accent} />
            <Copy size={11} weight="600">
              Expressions
            </Copy>
          </View>
        </Tap>

        <View
          style={{ width: 1, height: 24, backgroundColor: c.border }}
        />

        <Tap
          label="Customize Look & Lab"
          onPress={() => setStudioVisible(true)}
        >
          <View style={{ alignItems: "center", gap: 4, minWidth: 80 }}>
            <Ionicons name="options-outline" size={20} color={c.text} />
            <Copy size={11} weight="600">
              Lab & Sliders
            </Copy>
          </View>
        </Tap>

        <View
          style={{ width: 1, height: 24, backgroundColor: c.border }}
        />

        <Tap
          label="Nearby Drivers"
          onPress={() => router.push("/(tabs)/drivers")}
        >
          <View style={{ alignItems: "center", gap: 4, minWidth: 80 }}>
            <Ionicons name="radio-outline" size={20} color={c.text} />
            <Copy size={11} weight="600">
              {nearby.length ? `${nearby.length} Nearby` : "Radar"}
            </Copy>
          </View>
        </Tap>
      </View>

      {/* Character Studio Modal */}
      <CharacterStudioModal
        visible={studioVisible}
        onClose={() => setStudioVisible(false)}
      />
    </Screen>
  );
}
