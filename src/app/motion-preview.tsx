import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CloudPreview } from "../components/character/CloudPreview";
import { Copy } from "../components/ui/Kit";
import { useTheme } from "../constants/theme";
import type { DevLabRuntimeCommand, DevLabTelemetry } from "../domain/devlab/types";
import {
  CHERRI_ACROBAT_IDS,
  CHERRI_ACTING_CYCLES,
  CHERRI_BRAIN_SHA,
  CHERRI_INTENSITIES,
  CHERRI_MOODS,
  CHERRI_SIGNATURE_IDS,
} from "../domain/character/cherriBrain.generated";

/**
 * Developer brain lab. Route: /motion-preview
 * Buttons are trigger wrappers around the vendored CherriMind / BehaviourController.
 * They do not schedule a second mobile behaviour system.
 */
export default function MotionPreviewScreen() {
  const c = useTheme();
  const router = useRouter();
  const [command, setCommand] = useState<DevLabRuntimeCommand | null>(null);
  const [token, setToken] = useState(0);
  const [label, setLabel] = useState("AUTO MIND · NATURAL · EXPRESSIVE");
  const [autoMind, setAutoMind] = useState(true);
  const [telemetry, setTelemetry] = useState<DevLabTelemetry | null>(null);

  const fire = useCallback((next: DevLabRuntimeCommand, nextLabel: string) => {
    setLabel(nextLabel);
    setCommand(next);
    setToken((n) => n + 1);
  }, []);

  const chip = (active: boolean) => ({
    paddingHorizontal: 10,
    minHeight: 32,
    justifyContent: "center" as const,
    borderRadius: 999,
    backgroundColor: active ? "rgba(56,139,255,0.28)" : "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: active ? "rgba(56,139,255,0.7)" : "rgba(255,255,255,0.14)",
  });

  const mind = telemetry;
  const recent = Array.isArray(mind?.recentStories) ? mind.recentStories.slice(-4).join(", ") : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Cherri brain lab" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Copy weight="700">Cherri Brain Lab</Copy>
          <Copy muted size={10}>experimental full brain parity · not for main</Copy>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <CloudPreview
          size={300}
          presentation="hardware"
          interactive
          debugTelemetry
          runtimeCommand={command}
          commandToken={token}
          onTelemetry={setTelemetry}
        />
        <Copy muted size={12} style={{ marginTop: 6 }}>{label}</Copy>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 36 }}>
        <Copy size={11} muted>route /motion-preview · source {CHERRI_BRAIN_SHA.slice(0, 12)} · same CherriMind as web</Copy>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle auto mind" onPress={() => { const next = !autoMind; setAutoMind(next); fire({ type: "setAutoMind", enabled: next }, next ? "AUTO MIND ON" : "AUTO MIND OFF"); }} style={chip(autoMind)}>
            <Copy size={12}>{autoMind ? "AUTO MIND ON" : "AUTO MIND OFF"}</Copy>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next thought" onPress={() => fire({ type: "nextThought" }, "NEXT THOUGHT")} style={chip(false)}>
            <Copy size={12}>NEXT THOUGHT</Copy>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Play 60 second showcase" onPress={() => fire({ type: "playShowcase" }, "PLAY 60S SHOWCASE · DEMO_60S_ADORABILITY")} style={chip(false)}>
            <Copy size={12}>PLAY 60S SHOWCASE</Copy>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset mind" onPress={() => fire({ type: "resetMind" }, "RESET MIND")} style={chip(false)}>
            <Copy size={12}>RESET MIND</Copy>
          </Pressable>
        </View>

        <Copy weight="700" size={12}>Mood</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHERRI_MOODS.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Mood ${id}`} onPress={() => fire({ type: "setMood", id }, `mood ${id}`)} style={chip(mind?.mood === id)}>
              <Copy size={11}>{id}</Copy>
            </Pressable>
          ))}
        </View>

        <Copy weight="700" size={12}>Acting cycle</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHERRI_ACTING_CYCLES.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Cycle ${id}`} onPress={() => fire({ type: "setActingCycle", id }, `cycle ${id}`)} style={chip(mind?.cycle === id)}>
              <Copy size={11}>{id}</Copy>
            </Pressable>
          ))}
        </View>

        <Copy weight="700" size={12}>Intensity</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHERRI_INTENSITIES.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Intensity ${id}`} onPress={() => fire({ type: "setActingIntensity", id }, `intensity ${id}`)} style={chip(mind?.intensity === id)}>
              <Copy size={11}>{id}</Copy>
            </Pressable>
          ))}
        </View>

        <Copy weight="700" size={12}>Acrobat</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHERRI_ACROBAT_IDS.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={id} onPress={() => fire({ type: "triggerMotion", id }, id)} style={chip(false)}>
              <Copy size={11}>{id}</Copy>
            </Pressable>
          ))}
        </View>

        <Copy weight="700" size={12}>Signature catalogue</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHERRI_SIGNATURE_IDS.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={id} onPress={() => fire({ type: "playSignature", id }, id)} style={chip(mind?.storyId === id)}>
              <Copy size={11}>{id.replace(/^SIG_/, "")}</Copy>
            </Pressable>
          ))}
        </View>

        <View style={{ padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", gap: 2 }}>
          <Copy size={11}>story {mind?.storyId || "—"} · phase {mind?.phase || "—"}</Copy>
          <Copy size={11}>mood {mind?.mood || "—"} · cycle {mind?.cycle || "—"} · intensity {mind?.intensity || "—"}</Copy>
          <Copy size={11}>primitive {mind?.primitive || "—"} · cue {mind?.cue || "—"} · amount {mind?.actingAmount ?? "—"}</Copy>
          <Copy size={11}>gaze {mind?.gazeX ?? "—"}, {mind?.gazeY ?? "—"} · facing {fmt(mind?.facingYaw)} / {fmt(mind?.facingPitch)}</Copy>
          <Copy size={11}>perf {fmt(mind?.performanceYaw)} / {fmt(mind?.performancePitch)} / {fmt(mind?.performanceRoll)}</Copy>
          <Copy size={11}>core/shell/crown/mass {fmt(mind?.coreYaw)} / {fmt(mind?.shellYaw)} / {fmt(mind?.crownYaw)} / {fmt(mind?.massYaw)}</Copy>
          <Copy size={11}>body {fmt(mind?.bodyScaleX)} × {fmt(mind?.bodyScaleY)} · acting {fmt(mind?.actingScaleX)} × {fmt(mind?.actingScaleY)} · puff {fmt(mind?.actingPuff)}</Copy>
          <Copy size={11}>mouth {mind?.mouthAction || "—"} · tongue {fmt(mind?.mouthTongue)}</Copy>
          <Copy size={11}>recent {recent || "—"}</Copy>
          <Copy size={11}>fps {mind?.fps ?? "—"} · frame {mind?.frameTimeMs ?? "—"} ms · auto {mind?.autoMind === false ? "off" : "on"}</Copy>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function fmt(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}
