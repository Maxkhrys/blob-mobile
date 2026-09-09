import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CloudPreview } from "../components/character/CloudPreview";
import { DevSlider } from "../components/devlab/DevSlider";
import { Copy } from "../components/ui/Kit";
import { useTheme } from "../constants/theme";
import type { DevLabRuntimeCommand, DevLabTelemetry } from "../domain/devlab/types";
import {
  CHERRI_ACROBAT_IDS,
  CHERRI_ACTING_CYCLES,
  CHERRI_BRAIN_SHA,
  CHERRI_INTENSITIES,
  CHERRI_MOODS,
  CHERRI_PRIMITIVES,
  CHERRI_STORIES,
} from "../domain/character/cherriBrain.generated";

type LabTab = "LIVE" | "MIND" | "EMOTES" | "MOTION" | "FACE" | "PHYSICS" | "DEBUG";
type EmoteMode = "STORY" | "SIGNATURE" | "PRIMITIVE";
type StoryFilter = "ALL" | "CUTE" | "FUNNY" | "SLEEPY" | "MISC" | "MICRO";

const LAB_TABS: readonly LabTab[] = ["LIVE", "MIND", "EMOTES", "MOTION", "FACE", "PHYSICS", "DEBUG"];
const MOBILE_BRANCH = "feat/codex-mobile-true-web-parity-v2";

const FACE_CONTROLS = [
  { key: "eyeX", label: "Gaze X", min: -9, max: 9, step: 0.25, initial: 0 },
  { key: "eyeY", label: "Gaze Y", min: -7, max: 7, step: 0.25, initial: 0 },
  { key: "eyeLid", label: "Eye openness", min: 0, max: 1.2, step: 0.02, initial: 1 },
  { key: "leftEyeScaleX", label: "Left eye width", min: -0.3, max: 0.35, step: 0.01, initial: 0 },
  { key: "leftEyeScaleY", label: "Left eye height", min: -0.3, max: 0.35, step: 0.01, initial: 0 },
  { key: "rightEyeScaleX", label: "Right eye width", min: -0.3, max: 0.35, step: 0.01, initial: 0 },
  { key: "rightEyeScaleY", label: "Right eye height", min: -0.3, max: 0.35, step: 0.01, initial: 0 },
  { key: "leftEyeRotation", label: "Left eye rotation", min: -25, max: 25, step: 1, initial: 0 },
  { key: "rightEyeRotation", label: "Right eye rotation", min: -25, max: 25, step: 1, initial: 0 },
  { key: "leftLidBias", label: "Left lid bias", min: -1, max: 1, step: 0.02, initial: 0 },
  { key: "rightLidBias", label: "Right lid bias", min: -1, max: 1, step: 0.02, initial: 0 },
  { key: "pupilScale", label: "Pupil scale", min: 0.4, max: 1.8, step: 0.02, initial: 1 },
  { key: "leftPupilX", label: "Left pupil X", min: -1, max: 1, step: 0.02, initial: 0 },
  { key: "leftPupilY", label: "Left pupil Y", min: -1, max: 1, step: 0.02, initial: 0 },
  { key: "mouthCurve", label: "Mouth curve", min: -1, max: 1, step: 0.02, initial: 0.82 },
  { key: "mouthO", label: "Mouth O", min: 0, max: 1, step: 0.02, initial: 0 },
  { key: "mouthD", label: "Mouth D", min: 0, max: 1, step: 0.02, initial: 0 },
  { key: "mouthCrescent", label: "Mouth crescent", min: 0, max: 1, step: 0.02, initial: 0 },
  { key: "mouthTongue", label: "Tongue", min: 0, max: 1, step: 0.02, initial: 0 },
  { key: "mouthScaleX", label: "Mouth width", min: -0.55, max: 0.65, step: 0.02, initial: 0 },
  { key: "mouthScaleY", label: "Mouth height", min: -0.55, max: 0.8, step: 0.02, initial: 0 },
  { key: "mouthX", label: "Mouth X", min: -24, max: 24, step: 1, initial: 0 },
  { key: "mouthY", label: "Mouth Y", min: -24, max: 24, step: 1, initial: 0 },
] as const;

type FaceControlKey = (typeof FACE_CONTROLS)[number]["key"];

/** Mobile-first developer surface for the executable canonical Cherri runtime. */
export default function MotionPreviewScreen() {
  const c = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<LabTab>("LIVE");
  const [command, setCommand] = useState<DevLabRuntimeCommand | null>(null);
  const [token, setToken] = useState(0);
  const [autoMind, setAutoMind] = useState(true);
  const [telemetry, setTelemetry] = useState<DevLabTelemetry | null>(null);
  const [parityTrace, setParityTrace] = useState(false);
  const [physicsDebug, setPhysicsDebug] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [emoteMode, setEmoteMode] = useState<EmoteMode>("SIGNATURE");
  const [storyFilter, setStoryFilter] = useState<StoryFilter>("ALL");
  const [faceValues, setFaceValues] = useState<Record<FaceControlKey, number>>(
    () => Object.fromEntries(FACE_CONTROLS.map((item) => [item.key, item.initial])) as Record<FaceControlKey, number>,
  );

  const fire = useCallback((next: DevLabRuntimeCommand) => {
    setCommand(next);
    setToken((value) => value + 1);
  }, []);

  const filteredStories = useMemo(() => {
    const stories = CHERRI_STORIES.filter((story) =>
      emoteMode === "SIGNATURE" ? story.signature : !story.signature,
    );
    if (storyFilter === "ALL") return stories;
    if (storyFilter === "MICRO") return stories.filter((story) => story.category === "MICRO");
    if (storyFilter === "SLEEPY") {
      return stories.filter((story) => story.category === "SLEEPY" || (story.actingTags as readonly string[]).includes("sleepy"));
    }
    if (storyFilter === "CUTE" || storyFilter === "FUNNY") {
      return stories.filter((story) => (story.actingTags as readonly string[]).includes(storyFilter.toLowerCase()));
    }
    return stories.filter((story) =>
      !["MICRO", "SLEEPY"].includes(story.category) &&
      !(story.actingTags as readonly string[]).includes("cute") &&
      !(story.actingTags as readonly string[]).includes("funny"),
    );
  }, [emoteMode, storyFilter]);

  const updateOrientation = useCallback((nextYaw: number, nextPitch: number) => {
    setYaw(nextYaw);
    setPitch(nextPitch);
    fire({ type: "setOrientation", yaw: nextYaw, pitch: nextPitch });
  }, [fire]);

  const updateFace = useCallback((key: FaceControlKey, nextValue: number) => {
    setFaceValues((current) => ({ ...current, [key]: nextValue }));
    fire({ type: "setFaceOverride", values: { [key]: nextValue } });
  }, [fire]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Cherri Lab" hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Copy weight="800" style={{ letterSpacing: 1.5 }}>CHERRI LAB</Copy>
          <Copy muted size={10}>canonical runtime · developer only</Copy>
        </View>
        <View style={[styles.liveDot, { backgroundColor: telemetry?.active ? c.success : c.warning }]} />
      </View>

      <View style={styles.previewArea}>
        <CloudPreview
          size={248}
          presentation="hardware"
          interactive
          debugTelemetry
          parityTrace={parityTrace}
          physicsDebug={physicsDebug}
          runtimeCommand={command}
          commandToken={token}
          onTelemetry={setTelemetry}
        />
        <View style={[styles.nowPlaying, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Copy size={11} weight="800" numberOfLines={1}>{telemetry?.storyId || "AUTONOMOUS"}</Copy>
            <Copy muted size={10} numberOfLines={1}>{telemetry?.phase || "quiet"} · {telemetry?.primitive || "no primitive"}</Copy>
          </View>
          <Copy size={11} weight="800" style={{ color: c.accent }}>{telemetry?.fps ?? "—"} FPS</Copy>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }} contentContainerStyle={styles.tabs}>
        {LAB_TABS.map((item) => (
          <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && { backgroundColor: c.accentMuted, borderColor: c.accent }]}>
            <Copy size={11} weight="800" style={{ color: tab === item ? c.accent : c.textSecondary }}>{item}</Copy>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView key={tab} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tab === "LIVE" && <LiveTab telemetry={telemetry} autoMind={autoMind} setAutoMind={setAutoMind} fire={fire} c={c} />}
        {tab === "MIND" && <MindTab telemetry={telemetry} fire={fire} c={c} />}
        {tab === "EMOTES" && (
          <EmotesTab
            telemetry={telemetry}
            mode={emoteMode}
            setMode={setEmoteMode}
            filter={storyFilter}
            setFilter={setStoryFilter}
            stories={filteredStories}
            fire={fire}
            c={c}
          />
        )}
        {tab === "MOTION" && <MotionTab telemetry={telemetry} yaw={yaw} pitch={pitch} updateOrientation={updateOrientation} fire={fire} c={c} />}
        {tab === "FACE" && (
          <FaceTab
            values={faceValues}
            updateFace={updateFace}
            clear={() => {
              setFaceValues(Object.fromEntries(FACE_CONTROLS.map((item) => [item.key, item.initial])) as Record<FaceControlKey, number>);
              fire({ type: "clearFaceOverride" });
            }}
            c={c}
          />
        )}
        {tab === "PHYSICS" && <PhysicsTab telemetry={telemetry} physicsDebug={physicsDebug} setPhysicsDebug={setPhysicsDebug} fire={fire} c={c} />}
        {tab === "DEBUG" && (
          <DebugTab
            telemetry={telemetry}
            parityTrace={parityTrace}
            toggleTrace={() => {
              const enabled = !parityTrace;
              setParityTrace(enabled);
              fire({ type: "setParityTrace", enabled });
            }}
            c={c}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveTab({ telemetry, autoMind, setAutoMind, fire, c }: { telemetry: DevLabTelemetry | null; autoMind: boolean; setAutoMind: (value: boolean) => void; fire: (command: DevLabRuntimeCommand) => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <Section title="LIVE MIND" c={c}>
      <View style={styles.metricGrid}>
        <Metric label="MOOD" value={telemetry?.mood} />
        <Metric label="CYCLE" value={telemetry?.cycle} />
        <Metric label="INTENSITY" value={telemetry?.intensity} />
        <Metric label="AUTO MIND" value={autoMind ? "ON" : "OFF"} accent={autoMind} />
      </View>
      <View style={styles.buttonRow}>
        <LabButton label={autoMind ? "AUTO MIND ON" : "AUTO MIND OFF"} active={autoMind} onPress={() => { const enabled = !autoMind; setAutoMind(enabled); fire({ type: "setAutoMind", enabled }); }} />
        <LabButton label="NEXT THOUGHT" onPress={() => fire({ type: "nextThought" })} />
      </View>
      <View style={styles.buttonRow}>
        <LabButton label="PLAY 60S SHOWCASE" onPress={() => fire({ type: "playShowcase" })} />
        <LabButton label="RESET CHERRI" danger onPress={() => fire({ type: "reset" })} />
      </View>
    </Section>
    <Section title="CURRENT PERFORMANCE" c={c}>
      <TelemetryLine label="Story" value={telemetry?.storyId} />
      <TelemetryLine label="Phase / cue" value={`${telemetry?.phase || "—"} / ${telemetry?.cue || "—"}`} />
      <TelemetryLine label="Primitive" value={`${telemetry?.primitive || "—"} · ${fmt(telemetry?.actingAmount)}`} />
      <TelemetryLine label="Mouth / tongue" value={`${telemetry?.mouthAction || "—"} · ${fmt(telemetry?.mouthTongue)}`} />
    </Section>
  </>;
}

function MindTab({ telemetry, fire, c }: { telemetry: DevLabTelemetry | null; fire: (command: DevLabRuntimeCommand) => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <ChoiceSection title="MOOD" values={CHERRI_MOODS} active={telemetry?.mood?.toUpperCase()} onSelect={(id) => fire({ type: "setMood", id })} c={c} />
    <ChoiceSection title="ACTING CYCLE" values={CHERRI_ACTING_CYCLES} active={telemetry?.cycle} onSelect={(id) => fire({ type: "setActingCycle", id })} c={c} />
    <ChoiceSection title="INTENSITY" values={CHERRI_INTENSITIES} active={telemetry?.intensity} onSelect={(id) => fire({ type: "setActingIntensity", id })} c={c} />
    <Section title="MIND STATE" c={c}>
      <TelemetryLine label="Current story" value={telemetry?.storyId} />
      <TelemetryLine label="Phase" value={telemetry?.phase} />
      <TelemetryLine label="Recent stories" value={telemetry?.recentStories?.slice(-5).join(" · ")} />
      <TelemetryLine label="Drives" value={mindField(telemetry, "drives")} />
      <TelemetryLine label="Emotion" value={mindField(telemetry, "emotion")} />
      <TelemetryLine label="Next signature" value={mindField(telemetry, "nextSignatureMs", "not scheduled")} />
    </Section>
  </>;
}

function EmotesTab({ telemetry, mode, setMode, filter, setFilter, stories, fire, c }: { telemetry: DevLabTelemetry | null; mode: EmoteMode; setMode: (mode: EmoteMode) => void; filter: StoryFilter; setFilter: (filter: StoryFilter) => void; stories: readonly (typeof CHERRI_STORIES)[number][]; fire: (command: DevLabRuntimeCommand) => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <Section title="SOURCE" c={c}>
      <View style={styles.buttonRow}>
        {(["STORY", "SIGNATURE", "PRIMITIVE"] as const).map((item) => <LabButton key={item} label={item} active={mode === item} onPress={() => setMode(item)} />)}
      </View>
    </Section>
    {mode !== "PRIMITIVE" && <Section title="FILTER" c={c}><View style={styles.wrap}>{(["ALL", "CUTE", "FUNNY", "SLEEPY", "MISC", "MICRO"] as const).map((item) => <Pill key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</View></Section>}
    <Section title={mode === "PRIMITIVE" ? `PRIMITIVES · ${CHERRI_PRIMITIVES.length}` : `${mode} · ${stories.length}`} c={c}>
      <View style={styles.storyList}>
        {mode === "PRIMITIVE"
          ? CHERRI_PRIMITIVES.map((primitive) => <StoryRow key={primitive.id} id={primitive.id} meta={`${primitive.durationMs} ms · ${primitive.note}`} active={telemetry?.primitive === primitive.id} onPress={() => fire({ type: "triggerPrimitive", id: primitive.id })} />)
          : stories.map((story) => <StoryRow key={story.id} id={story.id} meta={`${story.category} · ${story.durationMs} ms · ${story.note}`} active={telemetry?.storyId === story.id} onPress={() => story.signature ? fire({ type: "playSignature", id: story.id }) : fire({ type: "playStory", id: story.id })} />)}
      </View>
    </Section>
  </>;
}

function MotionTab({ telemetry, yaw, pitch, updateOrientation, fire, c }: { telemetry: DevLabTelemetry | null; yaw: number; pitch: number; updateOrientation: (yaw: number, pitch: number) => void; fire: (command: DevLabRuntimeCommand) => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <Section title="ACROBATICS" c={c}><View style={styles.wrap}>{CHERRI_ACROBAT_IDS.map((id) => <Pill key={id} label={id} onPress={() => fire({ type: "triggerMotion", id })} />)}</View></Section>
    <Section title="ORIENTATION LAB" c={c}>
      <View style={styles.wrap}>{[0, 45, 90, 180, 270, 360].map((preset) => <Pill key={preset} label={`${preset}°`} active={yaw === preset} onPress={() => updateOrientation(preset, pitch)} />)}</View>
      <DevSlider label="Yaw" value={yaw} min={-360} max={360} step={1} onChange={(value) => updateOrientation(value, pitch)} />
      <DevSlider label="Pitch" value={pitch} min={-90} max={90} step={1} onChange={(value) => updateOrientation(yaw, value)} />
    </Section>
    <Section title="FACING × PERFORMANCE" c={c}>
      <TelemetryLine label="Face" value={`${fmt(telemetry?.facingYaw)} / ${fmt(telemetry?.facingPitch)}`} />
      <TelemetryLine label="Core" value={`${fmt(telemetry?.coreYaw)} / ${fmt(telemetry?.corePitch)}`} />
      <TelemetryLine label="Shell" value={`${fmt(telemetry?.shellYaw)} / ${fmt(telemetry?.shellPitch)}`} />
      <TelemetryLine label="Crown" value={`${fmt(telemetry?.crownYaw)} / ${fmt(telemetry?.crownPitch)}`} />
      <TelemetryLine label="Heavy mass" value={`${fmt(telemetry?.massYaw)} / ${fmt(telemetry?.massPitch)}`} />
      <TelemetryLine label="Performance" value={`${fmt(telemetry?.performanceYaw)} / ${fmt(telemetry?.performancePitch)} / ${fmt(telemetry?.performanceRoll)}`} />
    </Section>
  </>;
}

function FaceTab({ values, updateFace, clear, c }: { values: Record<FaceControlKey, number>; updateFace: (key: FaceControlKey, value: number) => void; clear: () => void; c: ReturnType<typeof useTheme> }) {
  return <Section title="CANONICAL FACE OVERRIDES" c={c}>
    <Copy muted size={11}>Temporary inspection values layer onto the live controller pose; they do not create a second face controller.</Copy>
    {FACE_CONTROLS.map((control) => <DevSlider key={control.key} label={control.label} value={values[control.key]} min={control.min} max={control.max} step={control.step} onChange={(value) => updateFace(control.key, value)} />)}
    <LabButton label="CLEAR FACE OVERRIDES" danger onPress={clear} />
  </Section>;
}

function PhysicsTab({ telemetry, physicsDebug, setPhysicsDebug, fire, c }: { telemetry: DevLabTelemetry | null; physicsDebug: boolean; setPhysicsDebug: React.Dispatch<React.SetStateAction<boolean>>; fire: (command: DevLabRuntimeCommand) => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <Section title="PHYSICAL TESTS" c={c}>
      <View style={styles.wrap}>{(["tap", "hold", "drag", "flick", "wall"] as const).map((id) => <Pill key={id} label={`${id.toUpperCase()} TEST`} onPress={() => fire({ type: "runTouchTest", id })} />)}</View>
      <LabButton label={physicsDebug ? "LOBE DEBUG ON" : "LOBE DEBUG OFF"} active={physicsDebug} onPress={() => setPhysicsDebug((value) => !value)} />
    </Section>
    <Section title="CONTACT" c={c}>
      <TelemetryLine label="Touch / drag" value={`${telemetry?.touching ? "DOWN" : "UP"} / ${telemetry?.dragging ? "ACTIVE" : "IDLE"}`} />
      <TelemetryLine label="Grab / wall pressure" value={`${fmt(telemetry?.grabPressure)} / ${fmt(telemetry?.wallPressure)}`} />
      <TelemetryLine label="Contact X / Y" value={`${fmt(telemetry?.contactX)} / ${fmt(telemetry?.contactY)}`} />
      <TelemetryLine label="Distance / radius" value={`${fmt(telemetry?.contactDistance)} / ${fmt(telemetry?.influenceRadius)}`} />
      <TelemetryLine label="Grip pull X / Y" value={`${fmt(telemetry?.gripPullX)} / ${fmt(telemetry?.gripPullY)}`} />
      <TelemetryLine label="Velocity X / Y" value={`${fmt(telemetry?.velocityX)} / ${fmt(telemetry?.velocityY)}`} />
      <TelemetryLine label="Acceleration X / Y" value={`${fmt(telemetry?.accelX)} / ${fmt(telemetry?.accelY)}`} />
      <TelemetryLine label="Corner / flick" value={`${fmt(telemetry?.cornerBlend)} / ${fmt(telemetry?.flickStretch)}`} />
      <TelemetryLine label="Face shift" value={`${fmt(telemetry?.faceShiftX)} / ${fmt(telemetry?.faceShiftY)}`} />
      <TelemetryLine label="Drag yaw / pitch" value={`${fmt(telemetry?.dragFaceYaw)} / ${fmt(telemetry?.dragFacePitch)}`} />
      <TelemetryLine label="Body scale" value={`${fmt(telemetry?.bodyScaleX)} × ${fmt(telemetry?.bodyScaleY)}`} />
      <TelemetryLine label="Cloud acting" value={`${fmt(telemetry?.actingScaleX)} × ${fmt(telemetry?.actingScaleY)} · puff ${fmt(telemetry?.actingPuff)}`} />
      <TelemetryLine label="Lobe deformation" value={fmt(telemetry?.lobeDeformationMagnitude)} />
    </Section>
  </>;
}

function DebugTab({ telemetry, parityTrace, toggleTrace, c }: { telemetry: DevLabTelemetry | null; parityTrace: boolean; toggleTrace: () => void; c: ReturnType<typeof useTheme> }) {
  return <>
    <Section title="BUILD" c={c}>
      <TelemetryLine label="LCDPROTO branch" value="feat/grok-terra-orientation-synthesis-v1" />
      <TelemetryLine label="LCDPROTO SHA" value={CHERRI_BRAIN_SHA} mono />
      <TelemetryLine label="Mobile branch" value={MOBILE_BRANCH} mono />
      <TelemetryLine label="Reduced Motion" value={telemetry?.reducedMotion ? "ON" : "OFF"} />
      <TelemetryLine label="FPS / frame / render" value={`${telemetry?.fps ?? "—"} / ${fmt(telemetry?.frameTimeMs)} ms / ${fmt(telemetry?.renderTimeMs)} ms`} />
      <TelemetryLine label="Face visibility" value={fmt(telemetry?.faceVisibility)} />
      <TelemetryLine label="Lobe deformation" value={fmt(telemetry?.lobeDeformationMagnitude)} />
    </Section>
    <Section title="RUNTIME" c={c}>
      <TelemetryLine label="Story" value={telemetry?.storyId} />
      <TelemetryLine label="Phase / cue" value={`${telemetry?.phase || "—"} / ${telemetry?.cue || "—"}`} />
      <TelemetryLine label="Primitive / amount" value={`${telemetry?.primitive || "—"} / ${fmt(telemetry?.actingAmount)}`} />
      <TelemetryLine label="Blob scale" value={fmt(telemetry?.blobScale)} />
      <TelemetryLine label="Body scale" value={`${fmt(telemetry?.bodyScaleX)} × ${fmt(telemetry?.bodyScaleY)}`} />
      <TelemetryLine label="Acting scale / puff" value={`${fmt(telemetry?.actingScaleX)} × ${fmt(telemetry?.actingScaleY)} / ${fmt(telemetry?.actingPuff)}`} />
      <TelemetryLine label="Gaze" value={`${fmt(telemetry?.gazeX)} / ${fmt(telemetry?.gazeY)}`} />
      <TelemetryLine label="Mouth / tongue" value={`${telemetry?.mouthAction || "—"} / ${fmt(telemetry?.mouthTongue)}`} />
      <TelemetryLine label="Facing" value={`${fmt(telemetry?.facingYaw)} / ${fmt(telemetry?.facingPitch)}`} />
      <TelemetryLine label="Performance" value={`${fmt(telemetry?.performanceYaw)} / ${fmt(telemetry?.performancePitch)} / ${fmt(telemetry?.performanceRoll)}`} />
      <TelemetryLine label="Core" value={`${fmt(telemetry?.coreYaw)} / ${fmt(telemetry?.corePitch)}`} />
      <TelemetryLine label="Shell" value={`${fmt(telemetry?.shellYaw)} / ${fmt(telemetry?.shellPitch)}`} />
      <TelemetryLine label="Crown" value={`${fmt(telemetry?.crownYaw)} / ${fmt(telemetry?.crownPitch)}`} />
      <TelemetryLine label="Heavy mass" value={`${fmt(telemetry?.massYaw)} / ${fmt(telemetry?.massPitch)}`} />
      <TelemetryLine label="Touch / drag" value={`${telemetry?.touching ? "DOWN" : "UP"} / ${telemetry?.dragging ? "ACTIVE" : "IDLE"}`} />
    </Section>
    <Section title="PARITY TRACE" c={c}>
      <LabButton label={parityTrace ? "PARITY TRACE ON" : "PARITY TRACE OFF"} active={parityTrace} onPress={toggleTrace} />
      <Copy muted size={11}>Streams the exact CONTROLLER → JELLY TARGET → PHYSICS → RIG → CLOUD stage snapshots used by this frame.</Copy>
    </Section>
    {parityTrace && telemetry?.stages && <>
      <TraceCard title="CONTROLLER" data={telemetry.stages.controller} />
      <TraceCard title="JELLY TARGET" data={telemetry.stages.jellyTarget} />
      <TraceCard title="PHYSICS" data={telemetry.stages.physics} />
      <TraceCard title="RIG" data={telemetry.stages.rig} />
      <TraceCard title="CLOUD" data={telemetry.stages.cloud} />
    </>}
  </>;
}

function Section({ title, children, c }: { title: string; children: React.ReactNode; c: ReturnType<typeof useTheme> }) {
  return <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}><Copy muted size={10} weight="800" style={styles.sectionTitle}>{title}</Copy>{children}</View>;
}

function ChoiceSection({ title, values, active, onSelect, c }: { title: string; values: readonly string[]; active?: string | null; onSelect: (value: string) => void; c: ReturnType<typeof useTheme> }) {
  return <Section title={title} c={c}><View style={styles.wrap}>{values.map((value) => <Pill key={value} label={value} active={active === value} onPress={() => onSelect(value)} />)}</View></Section>;
}

function LabButton({ label, onPress, active = false, danger = false }: { label: string; onPress: () => void; active?: boolean; danger?: boolean }) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentMuted : c.surfaceElevated }, danger && { borderColor: c.danger, backgroundColor: c.dangerMuted }, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}><Copy size={11} weight="800" style={{ color: danger ? c.danger : active ? c.accent : c.text }}>{label}</Copy></Pressable>;
}

function Pill({ label, onPress, active = false }: { label: string; onPress: () => void; active?: boolean }) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: active ? c.accentMuted : c.surfaceElevated, borderColor: active ? c.accent : c.border }, pressed && { opacity: 0.72 }]}><Copy size={10} weight="800" style={{ color: active ? c.accent : c.textSecondary }}>{label}</Copy></Pressable>;
}

function StoryRow({ id, meta, active, onPress }: { id: string; meta: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${id}`} onPress={onPress} style={({ pressed }) => [styles.storyRow, { borderColor: active ? c.accent : c.borderSubtle, backgroundColor: active ? c.accentMuted : c.surfaceElevated }, pressed && { opacity: 0.72 }]}><View style={{ flex: 1, gap: 2 }}><Copy size={11} weight="800">{id.replace(/^SIG_/, "")}</Copy><Copy muted size={10} numberOfLines={2}>{meta}</Copy></View><Ionicons name="play" size={15} color={active ? c.accent : c.textTertiary} /></Pressable>;
}

function Metric({ label, value, accent = false }: { label: string; value?: string | null; accent?: boolean }) {
  const c = useTheme();
  return <View style={[styles.metric, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}><Copy muted size={9} weight="800">{label}</Copy><Copy size={11} weight="800" numberOfLines={1} style={{ color: accent ? c.success : c.text }}>{value || "—"}</Copy></View>;
}

function TelemetryLine({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  const c = useTheme();
  return <View style={[styles.telemetryLine, { borderBottomColor: c.borderSubtle }]}><Copy muted size={10}>{label}</Copy><Text numberOfLines={2} style={{ flex: 1, textAlign: "right", color: c.text, fontSize: 10, fontWeight: "700", fontFamily: mono ? "monospace" : undefined }}>{value ?? "—"}</Text></View>;
}

function TraceCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const c = useTheme();
  return <View style={[styles.trace, { backgroundColor: c.surface, borderColor: c.border }]}><Copy size={10} weight="800" style={{ color: c.accent }}>{title}</Copy><Text selectable style={{ color: c.textSecondary, fontFamily: "monospace", fontSize: 9, lineHeight: 13 }}>{JSON.stringify(data, null, 1)}</Text></View>;
}

function mindField(telemetry: DevLabTelemetry | null, key: string, fallback = "—") {
  const value = telemetry?.mind?.[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fmt(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}

const styles = StyleSheet.create({
  header: { height: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  previewArea: { alignItems: "center", paddingBottom: 7 },
  nowPlaying: { width: "88%", minHeight: 38, borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 10, marginTop: -3 },
  tabs: { paddingHorizontal: 12, paddingVertical: 7, gap: 6 },
  tab: { minHeight: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  content: { padding: 12, gap: 10, paddingBottom: 48 },
  section: { borderWidth: 1, borderRadius: 17, padding: 12, gap: 10 },
  sectionTitle: { letterSpacing: 1.15 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metric: { width: "48%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, gap: 3 },
  buttonRow: { flexDirection: "row", gap: 7 },
  action: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: { minHeight: 36, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  storyList: { gap: 7 },
  storyRow: { minHeight: 54, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  telemetryLine: { minHeight: 29, paddingVertical: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  trace: { borderWidth: 1, borderRadius: 15, padding: 11, gap: 8 },
});
