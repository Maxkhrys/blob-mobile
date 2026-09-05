import { getStateMeta } from "../../domain/productStates/stateEmotionMap";
import React from "react";
import { View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { CloudPreview } from "../../components/character/CloudPreview";
import { Screen, Copy, Tap, Avatar, layout } from "../../components/ui/Kit";
import { useTheme } from "../../constants/theme";
import { narrative } from "../../components/home/narrative";
export default function HomeScreen() {
  const { profile, device, proximity, cloudEmotion, drivers } = useAppStore();
  const router = useRouter();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const name = proximity.driverName || "Your friend";
  const [title, sub] = narrative(
    proximity.state,
    name,
    profile.characterName || "Your Cherri",
  );
  const nearby = drivers.filter((d) =>
    ["Nearby", "Approaching", "Very close", "Together"].includes(d.status),
  );
  return (
    <Screen>
      <View style={layout.between}>
        <Copy size={20} weight="700" style={{ letterSpacing: 2 }}>
          CHERRIPI
        </Copy>
        <Tap
          label="Your profile"
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Avatar name={profile.username} uri={profile.avatarUri} size={42} />
        </Tap>
      </View>
      <View
        style={{
          alignItems: "center",
          gap: 22,
          paddingTop: 12,
          paddingBottom: 6,
        }}
      >
        <CloudPreview
          size={Math.min(width - 64, 326)}
          colourId={profile.characterColour}
          environment={profile.environment}
          emotion={cloudEmotion}
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
        <Tap
          label="Device settings"
          onPress={() => router.push("/(tabs)/settings")}
        >
          <View style={layout.row}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  device.state === "Connected" ? c.success : c.warning,
              }}
            />
            <Copy size={12} muted>
              {device.state === "Connected"
                ? "Cherri is connected"
                : device.state}{" "}
              · {device.battery}%
            </Copy>
          </View>
        </Tap>
      </View>
      <View style={{ gap: 8, alignItems: "center" }}>
        <Copy
          size={28}
          weight="500"
          style={{
            textAlign: "center",
            letterSpacing: -0.6,
            color:
              proximity.state === "HOME"
                ? c.text
                : getStateMeta(proximity.state).accent,
          }}
        >
          {title}
        </Copy>
        <Copy muted style={{ textAlign: "center", maxWidth: 270 }}>
          {sub}
        </Copy>
      </View>
      <View style={[layout.row, { justifyContent: "center", gap: 30 }]}>
        {(
          [
            {
              label: "Customize",
              icon: "options-outline",
              route: "/(tabs)/character",
            },
            {
              label: "Your drivers",
              icon: "people-outline",
              route: "/(tabs)/drivers",
            },
          ] as const
        ).map((a) => (
          <Tap
            key={a.label}
            label={a.label}
            onPress={() => router.push(a.route)}
          >
            <View style={{ alignItems: "center", gap: 8, padding: 12 }}>
              <Ionicons name={a.icon} size={23} color={c.text} />
              <Copy size={13}>{a.label}</Copy>
            </View>
          </Tap>
        ))}
      </View>
      <View style={[layout.between, { paddingTop: 4 }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Copy size={14} weight="600">
            {nearby.length
              ? `${nearby.length} familiar ${nearby.length === 1 ? "face" : "faces"} nearby`
              : "The road is quiet"}
          </Copy>
          <Copy size={13} muted>
            {nearby.length
              ? nearby.map((d) => d.name).join(", ")
              : "Your next hello will find you here."}
          </Copy>
        </View>
        <Ionicons name="radio-outline" size={25} color={c.textSecondary} />
      </View>
    </Screen>
  );
}
