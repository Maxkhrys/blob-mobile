import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CloudPreview } from "../components/character/CloudPreview";
import { Copy } from "../components/ui/Kit";
import { useTheme } from "../constants/theme";
import type { DevLabRuntimeCommand } from "../domain/devlab/types";

/**
 * Temporary developer screen. Uses the existing WebView canvas runtime.
 * Action ids are the LCDPROTO names, not invented labels.
 */
const TRIGGERS: readonly { id: string; label: string }[] = [
  { id: "NEUTRAL", label: "neutral" },
  { id: "TURN_LEFT", label: "turn left" },
  { id: "TURN_RIGHT", label: "turn right" },
  { id: "SPIN_360", label: "360" },
  { id: "BACKFLIP", label: "backflip" },
  { id: "FRONTFLIP", label: "frontflip" },
  { id: "CARTWHEEL_LEFT", label: "cartwheel left" },
  { id: "CARTWHEEL_RIGHT", label: "cartwheel right" },
  { id: "SIG_PANCAKE", label: "pancake" },
  { id: "SIG_GIANT_PROUD_PUFF", label: "puff" },
  { id: "SIG_TALL_STRETCH", label: "stretch" },
];

export default function MotionPreviewScreen() {
  const c = useTheme();
  const router = useRouter();
  const [command, setCommand] = useState<DevLabRuntimeCommand | null>(null);
  const [token, setToken] = useState(0);
  const [label, setLabel] = useState("idle");

  const fire = useCallback((id: string, nextLabel: string) => {
    setLabel(nextLabel);
    setCommand({ type: "triggerMotion", id });
    setToken((n) => n + 1);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Close motion preview" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Copy weight="700">Character Motion Preview</Copy>
          <Copy muted size={10}>experimental · not for main</Copy>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <CloudPreview
          size={320}
          presentation="hardware"
          interactive={false}
          runtimeCommand={command}
          commandToken={token}
        />
        <Copy muted size={12} style={{ marginTop: 6 }}>
          {label}
        </Copy>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 28 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play showcase"
          onPress={() => fire("PLAY_SHOWCASE", "PLAY SHOWCASE")}
          style={({ pressed }) => ({
            minHeight: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#388BFF",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Copy weight="700" style={{ color: "#fff" }}>PLAY SHOWCASE</Copy>
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TRIGGERS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => fire(item.id, `${item.label} · ${item.id}`)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                minHeight: 36,
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Copy size={13}>{item.label}</Copy>
            </Pressable>
          ))}
        </View>
        <Copy muted size={11}>
          Visual test only. Blink, float, and breath stay on the existing runtime. Flips and profile turns are unverified on device until a simulator build is watched.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
