import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CloudPreview } from "../components/character/CloudPreview";
import { DevSlider } from "../components/devlab/DevSlider";
import { Copy } from "../components/ui/Kit";
import { AtmosphericBackground } from "../components/ui/AtmosphericBackground";
import { GlassOrbFrame } from "../components/ui/Glass";
import { useTheme } from "../constants/theme";
import { useAppStore } from "../store/AppContext";
import {
  CLOUD_SLIDERS,
  CloudSliderDef,
  CloudSettingsValues,
} from "../domain/character/cloudSliders";
import {
  ALL_BEHAVIOURS,
  EXPRESSION_FILTERS,
  ExpressionCategory,
} from "../domain/expressions/catalog";
import { CANONICAL_CLOUD_PRESETS } from "../domain/palettes/presets";
import { CANONICAL_ENVIRONMENTS } from "../domain/environments/presets";
import { CORE_PERFORMANCES, SYSTEM_SCREENS } from "../domain/devlab/catalog";
import {
  createBlankExpressionRecipe,
  DevLabRuntimeCommand,
  DevLabSection,
  DevLabTelemetry,
  DevPreset,
  ExpressionRecipe,
  LCDPROTO_SOURCE_SHA,
} from "../domain/devlab/types";
import { DevLabStorage } from "../services/devlab/DevLabStorage";
import type { ProximityState } from "../types";

const SECTIONS: readonly { id: DevLabSection; label: string }[] = [
  { id: "character", label: "Character" },
  { id: "motion", label: "Motion" },
  { id: "physics", label: "Physics" },
  { id: "cloud", label: "Cloud" },
  { id: "face", label: "Face" },
  { id: "expressions", label: "Expressions" },
  { id: "performance", label: "Performance" },
  { id: "environment", label: "Environment" },
  { id: "states", label: "States" },
  { id: "screens", label: "Screens" },
  { id: "playback", label: "Playback" },
  { id: "debug", label: "Debug" },
];

const PRODUCT_STATES: readonly ProximityState[] = [
  "HOME",
  "SENSED",
  "APPROACHING",
  "VERY_CLOSE",
  "TOGETHER",
  "SYNC",
  "CONNECTED",
  "RECOGNIZED",
  "GOODBYE",
];

const PHYSICS_PARAM_KEYS = new Set([
  "squash",
  "stretch",
  "lean",
  "leftBulge",
  "rightBulge",
  "topBulge",
  "bottomSag",
]);
const PHYSICS_MOTION_KEYS = new Set([
  "lobeLag",
  "springStiffness",
  "springDamping",
]);

function cloneSettings(value: CloudSettingsValues): CloudSettingsValues {
  return JSON.parse(JSON.stringify(value));
}

function ToolbarButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.14)",
        shadowColor: active ? "#388BFF" : "transparent",
        shadowOpacity: active ? 0.45 : 0,
        shadowRadius: 8,
        opacity: pressed ? 0.68 : 1,
      })}
    >
      <Ionicons name={icon} size={19} color={active ? "#fff" : "rgba(240, 244, 252, 0.85)"} />
    </Pressable>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        minHeight: 38,
        justifyContent: "center",
        borderRadius: 9999,
        backgroundColor: selected ? "#388BFF" : "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: selected ? "#388BFF" : "rgba(255, 255, 255, 0.14)",
        shadowColor: selected ? "#388BFF" : "transparent",
        shadowOpacity: selected ? 0.4 : 0,
        shadowRadius: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Copy size={13} weight={selected ? "700" : "500"} style={{ color: selected ? "#fff" : "rgba(240, 244, 252, 0.80)" }}>
        {label}
      </Copy>
    </Pressable>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <Copy size={12} muted weight="700" style={{ textTransform: "uppercase", letterSpacing: 1.1, marginTop: 6, color: "rgba(240, 244, 252, 0.50)" }}>
      {children}
    </Copy>
  );
}

export default function DevLabScreen() {
  const router = useRouter();
  const c = useTheme();
  const { profile, cloudSettings, updateCloudSettings, resetCloudSettings } = useAppStore();
  const [section, setSection] = useState<DevLabSection>("character");
  const [driverYaw, setDriverYaw] = useState(0);
  const [driverPitch, setDriverPitch] = useState(0);
  const [showPupils, setShowPupils] = useState(false);
  const [environment, setEnvironment] = useState<string>(profile.environment);
  const [paletteId, setPaletteId] = useState<string>(profile.characterColour);
  const [devState, setDevState] = useState<ProximityState>("HOME");
  const [paused, setPaused] = useState(false);
  const [command, setCommand] = useState<DevLabRuntimeCommand | null>(null);
  const [commandToken, setCommandToken] = useState(0);
  const [telemetry, setTelemetry] = useState<DevLabTelemetry | null>(null);
  const [expressionFilter, setExpressionFilter] = useState<ExpressionCategory>("ALL");
  const [recipe, setRecipe] = useState<ExpressionRecipe>(() => createBlankExpressionRecipe());
  const [recipeEnabled, setRecipeEnabled] = useState(false);
  const [recipes, setRecipes] = useState<ExpressionRecipe[]>([]);
  const [presets, setPresets] = useState<DevPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [selectedScreenId, setSelectedScreenId] = useState("BOOT_BLACK");

  useEffect(() => {
    void Promise.all([DevLabStorage.loadPresets(), DevLabStorage.loadRecipes()]).then(
      ([savedPresets, savedRecipes]) => {
        setPresets(savedPresets);
        setRecipes(savedRecipes);
      },
    );
  }, []);

  const issue = useCallback((next: DevLabRuntimeCommand) => {
    setCommand(next);
    setCommandToken((v) => v + 1);
  }, []);

  const palette = useMemo(
    () =>
      CANONICAL_CLOUD_PRESETS.find(
        (p) => p.id === paletteId || p.label.toLowerCase() === paletteId.toLowerCase(),
      )?.colour || CANONICAL_CLOUD_PRESETS[1].colour,
    [paletteId],
  );

  const updateSlider = useCallback(
    (def: CloudSliderDef, value: number) => {
      if (def.group === "face") {
        updateCloudSettings({ face: { ...cloudSettings.face, [def.key]: value } });
        return;
      }
      updateCloudSettings({
        [def.group]: {
          ...cloudSettings[def.group],
          [def.key]: value,
        },
      } as Partial<CloudSettingsValues>);
    },
    [cloudSettings, updateCloudSettings],
  );

  const valueFor = (def: CloudSliderDef) => {
    if (def.group === "face") return cloudSettings.face[def.key as keyof typeof cloudSettings.face];
    return cloudSettings[def.group][def.key] ?? def.fallback;
  };

  const renderSliders = (defs: readonly CloudSliderDef[]) => (
    <View>
      {defs.map((def) => (
        <DevSlider
          key={`${def.group}-${def.key}`}
          label={def.label}
          value={valueFor(def)}
          min={def.min}
          max={def.max}
          step={def.step}
          onChange={(value) => updateSlider(def, value)}
        />
      ))}
    </View>
  );

  const savePreset = async () => {
    const next: DevPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim() || `Dev preset ${presets.length + 1}`,
      cloudSettings: cloneSettings(cloudSettings),
      driverYaw,
      driverPitch,
      showPupils,
      environment,
      createdAt: Date.now(),
    };
    const updated = [next, ...presets].slice(0, 24);
    setPresets(updated);
    setPresetName("");
    await DevLabStorage.savePresets(updated);
  };

  const applyPreset = (preset: DevPreset) => {
    updateCloudSettings(cloneSettings(preset.cloudSettings));
    setDriverYaw(preset.driverYaw);
    setDriverPitch(preset.driverPitch);
    setShowPupils(preset.showPupils);
    setEnvironment(preset.environment);
    issue({ type: "center" });
  };

  const saveRecipe = async () => {
    const saved = {
      ...recipe,
      id: recipe.id.startsWith("mobile-") ? recipe.id : `mobile-${Date.now()}`,
      label: recipe.label.trim() || `Recipe ${recipes.length + 1}`,
      isCustom: true,
      category: "custom" as const,
    };
    const updated = [saved, ...recipes.filter((r) => r.id !== saved.id)].slice(0, 40);
    setRecipe(saved);
    setRecipes(updated);
    setRecipeEnabled(true);
    await DevLabStorage.saveRecipes(updated);
  };

  const patchEye = (
    side: "leftEye" | "rightEye",
    key: keyof ExpressionRecipe["leftEye"],
    value: number,
  ) => {
    setRecipe((prev) => ({ ...prev, [side]: { ...prev[side], [key]: value } }));
    setRecipeEnabled(true);
  };

  const patchMouth = (key: keyof ExpressionRecipe["mouth"], value: number) => {
    setRecipe((prev) => ({ ...prev, mouth: { ...prev.mouth, [key]: value } }));
    setRecipeEnabled(true);
  };

  const cloudDefs = CLOUD_SLIDERS.filter(
    (d) =>
      d.group === "colour" ||
      (d.group === "params" && !PHYSICS_PARAM_KEYS.has(d.key)),
  );
  const physicsDefs = CLOUD_SLIDERS.filter(
    (d) =>
      (d.group === "params" && PHYSICS_PARAM_KEYS.has(d.key)) ||
      (d.group === "motion" && PHYSICS_MOTION_KEYS.has(d.key)),
  );
  const motionDefs = CLOUD_SLIDERS.filter(
    (d) => d.group === "motion" && !PHYSICS_MOTION_KEYS.has(d.key),
  );
  const trailDefs = CLOUD_SLIDERS.filter((d) => d.group === "trails");
  const faceDefs = CLOUD_SLIDERS.filter((d) => d.group === "face");
  const filteredExpressions =
    expressionFilter === "ALL"
      ? ALL_BEHAVIOURS
      : ALL_BEHAVIOURS.filter((entry) => entry.category === expressionFilter);
  const selectedScreen = SYSTEM_SCREENS.find((screen) => screen.id === selectedScreenId);

  const renderSection = () => {
    if (section === "character") {
      return (
        <View style={{ gap: 18 }}>
          <GroupTitle>Colour</GroupTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CANONICAL_CLOUD_PRESETS.map((preset) => (
              <Choice
                key={preset.id}
                label={preset.label}
                selected={paletteId === preset.id || paletteId === preset.label.toLowerCase()}
                onPress={() => setPaletteId(preset.id)}
              />
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View><Copy weight="600">Pupils</Copy><Copy muted size={12}>Renderer pupil layer</Copy></View>
            <Switch value={showPupils} onValueChange={setShowPupils} trackColor={{ true: c.accent }} />
          </View>
          <DevSlider label="Yaw" value={driverYaw} min={-1} max={1} step={0.02} onChange={setDriverYaw} />
          <DevSlider label="Pitch" value={driverPitch} min={-1} max={1} step={0.02} onChange={setDriverPitch} />
          <GroupTitle>Developer presets</GroupTitle>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Preset name"
              placeholderTextColor={c.textSecondary}
              style={{ flex: 1, minHeight: 42, borderBottomWidth: 1, borderColor: c.border, color: c.text, fontSize: 14 }}
            />
            <Choice label="Save current" onPress={() => void savePreset()} />
          </View>
          {presets.map((preset) => (
            <Pressable key={preset.id} onPress={() => applyPreset(preset)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Copy weight="600">{preset.name}</Copy>
              <Copy muted size={12}>{preset.environment} · yaw {preset.driverYaw.toFixed(2)} · pitch {preset.driverPitch.toFixed(2)}</Copy>
            </Pressable>
          ))}
        </View>
      );
    }

    if (section === "motion") {
      return <View style={{ gap: 12 }}><GroupTitle>Ambient / shell motion</GroupTitle>{renderSliders(motionDefs)}<GroupTitle>Manual turn driver</GroupTitle><DevSlider label="Yaw" value={driverYaw} min={-1} max={1} step={0.02} onChange={setDriverYaw} /><DevSlider label="Pitch" value={driverPitch} min={-1} max={1} step={0.02} onChange={setDriverPitch} /></View>;
    }

    if (section === "physics") {
      return <View style={{ gap: 12 }}><GroupTitle>Canonical deformation + spring controls</GroupTitle>{renderSliders(physicsDefs)}<Copy muted size={12}>Drag Cherri into every edge of round display above. Contact deformation stays inside LCDPROTO BlobDragController / BlobJellyPhysics.</Copy></View>;
    }

    if (section === "cloud") {
      return <View style={{ gap: 16 }}><GroupTitle>Material / lobes / light</GroupTitle>{renderSliders(cloudDefs)}<GroupTitle>Mist / trails</GroupTitle>{renderSliders(trailDefs)}</View>;
    }

    if (section === "face") {
      return (
        <View style={{ gap: 16 }}>
          <GroupTitle>Face placement</GroupTitle>
          {renderSliders(faceDefs)}
          <GroupTitle>Expression Maker</GroupTitle>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput value={recipe.label} onChangeText={(label) => setRecipe((r) => ({ ...r, label }))} style={{ flex: 1, minHeight: 42, color: c.text, borderBottomWidth: 1, borderColor: c.border }} />
            <Choice label="Save recipe" onPress={() => void saveRecipe()} />
            <Choice label={recipeEnabled ? "Live" : "Off"} selected={recipeEnabled} onPress={() => setRecipeEnabled((v) => !v)} />
          </View>
          <GroupTitle>Left eye</GroupTitle>
          <DevSlider label="Eye X" value={recipe.leftEye.socketX} min={-20} max={20} step={0.5} onChange={(v) => patchEye("leftEye", "socketX", v)} />
          <DevSlider label="Eye Y" value={recipe.leftEye.socketY} min={-20} max={20} step={0.5} onChange={(v) => patchEye("leftEye", "socketY", v)} />
          <DevSlider label="Width" value={recipe.leftEye.width} min={0.45} max={1.7} step={0.01} onChange={(v) => patchEye("leftEye", "width", v)} />
          <DevSlider label="Height" value={recipe.leftEye.height} min={0.45} max={1.7} step={0.01} onChange={(v) => patchEye("leftEye", "height", v)} />
          <DevSlider label="Opening" value={recipe.leftEye.open} min={0} max={1.4} step={0.01} onChange={(v) => patchEye("leftEye", "open", v)} />
          <DevSlider label="Brow lift" value={recipe.leftEye.browLift} min={-1} max={1} step={0.02} onChange={(v) => patchEye("leftEye", "browLift", v)} />
          <DevSlider label="Brow tilt" value={recipe.leftEye.browTilt} min={-30} max={30} step={1} onChange={(v) => patchEye("leftEye", "browTilt", v)} />
          <DevSlider label="Lid bias" value={recipe.leftEye.lidBias || 0} min={-1} max={1} step={0.02} onChange={(v) => patchEye("leftEye", "lidBias", v)} />
          <GroupTitle>Right eye</GroupTitle>
          <DevSlider label="Eye X" value={recipe.rightEye.socketX} min={-20} max={20} step={0.5} onChange={(v) => patchEye("rightEye", "socketX", v)} />
          <DevSlider label="Eye Y" value={recipe.rightEye.socketY} min={-20} max={20} step={0.5} onChange={(v) => patchEye("rightEye", "socketY", v)} />
          <DevSlider label="Width" value={recipe.rightEye.width} min={0.45} max={1.7} step={0.01} onChange={(v) => patchEye("rightEye", "width", v)} />
          <DevSlider label="Height" value={recipe.rightEye.height} min={0.45} max={1.7} step={0.01} onChange={(v) => patchEye("rightEye", "height", v)} />
          <DevSlider label="Opening" value={recipe.rightEye.open} min={0} max={1.4} step={0.01} onChange={(v) => patchEye("rightEye", "open", v)} />
          <DevSlider label="Brow lift" value={recipe.rightEye.browLift} min={-1} max={1} step={0.02} onChange={(v) => patchEye("rightEye", "browLift", v)} />
          <DevSlider label="Brow tilt" value={recipe.rightEye.browTilt} min={-30} max={30} step={1} onChange={(v) => patchEye("rightEye", "browTilt", v)} />
          <DevSlider label="Lid bias" value={recipe.rightEye.lidBias || 0} min={-1} max={1} step={0.02} onChange={(v) => patchEye("rightEye", "lidBias", v)} />
          <GroupTitle>Mouth</GroupTitle>
          <DevSlider label="Mouth X" value={recipe.mouth.x} min={-20} max={20} step={0.5} onChange={(v) => patchMouth("x", v)} />
          <DevSlider label="Mouth Y" value={recipe.mouth.y} min={-20} max={20} step={0.5} onChange={(v) => patchMouth("y", v)} />
          <DevSlider label="Width" value={recipe.mouth.width} min={0.4} max={2} step={0.01} onChange={(v) => patchMouth("width", v)} />
          <DevSlider label="Height" value={recipe.mouth.height} min={0.35} max={2} step={0.01} onChange={(v) => patchMouth("height", v)} />
          <DevSlider label="Curve" value={recipe.mouth.curve} min={-1.2} max={1.2} step={0.02} onChange={(v) => patchMouth("curve", v)} />
          <DevSlider label="D mouth" value={recipe.mouth.dAmount} min={0} max={1} step={0.02} onChange={(v) => patchMouth("dAmount", v)} />
          <DevSlider label="O mouth" value={recipe.mouth.oAmount} min={0} max={1} step={0.02} onChange={(v) => patchMouth("oAmount", v)} />
          <DevSlider label="Crescent" value={recipe.mouth.crescentSmileAmount || 0} min={0} max={1} step={0.02} onChange={(v) => patchMouth("crescentSmileAmount", v)} />
          {recipes.length > 0 && <GroupTitle>Saved recipes</GroupTitle>}
          {recipes.map((saved) => <Pressable key={saved.id} onPress={() => { setRecipe(saved); setRecipeEnabled(true); }} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border }}><Copy weight="600">{saved.label}</Copy><Copy muted size={11}>{saved.id}</Copy></Pressable>)}
        </View>
      );
    }

    if (section === "expressions") {
      return (
        <View style={{ gap: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {EXPRESSION_FILTERS.map((filter) => <Choice key={filter} label={filter} selected={expressionFilter === filter} onPress={() => setExpressionFilter(filter)} />)}
          </ScrollView>
          {filteredExpressions.map((entry) => (
            <Pressable key={entry.id} onPress={() => issue({ type: "triggerBehaviour", id: entry.id })} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Copy weight="600">{entry.label}</Copy><Copy muted size={12}>{entry.id} · {entry.hint}</Copy>
            </Pressable>
          ))}
        </View>
      );
    }

    if (section === "performance") {
      return (
        <View style={{ gap: 2 }}>
          <Copy muted size={12} style={{ marginBottom: 8 }}>Canonical core performance catalogue. Tap to replay matching runtime action.</Copy>
          {CORE_PERFORMANCES.map((performance) => (
            <Pressable key={performance.id} onPress={() => issue({ type: "triggerBehaviour", id: performance.id })} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Copy weight="600">{performance.label}</Copy><Copy muted size={12}>{performance.durationMs} ms</Copy></View>
              <Copy muted size={12}>{performance.description}</Copy>
            </Pressable>
          ))}
        </View>
      );
    }

    if (section === "environment") {
      return <View style={{ gap: 8 }}>{CANONICAL_ENVIRONMENTS.map((env) => <Pressable key={env.id} onPress={() => setEnvironment(env.id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Copy weight="600">{env.label}</Copy>{environment === env.id && <Ionicons name="checkmark" size={18} color={c.accent} />}</View><Copy muted size={12}>{env.description}</Copy></Pressable>)}</View>;
    }

    if (section === "states") {
      return <View style={{ gap: 8 }}>{PRODUCT_STATES.map((state) => <Choice key={state} label={state} selected={devState === state} onPress={() => setDevState(state)} />)}<Copy muted size={12}>State testing is isolated inside Dev Lab. It does not overwrite consumer encounter history or saved Cherri colour.</Copy></View>;
    }

    if (section === "screens") {
      return (
        <View style={{ gap: 10 }}>
          <Copy muted size={12}>Catalogue and lifecycle metadata are synced from LCDPROTO. State screens can drive live Cherri here. System-screen artwork remains canonical desktop renderer until its exact renderer is vendored; no fake mobile substitutes.</Copy>
          {selectedScreen && <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}><Copy weight="700">{selectedScreen.label}</Copy><Copy muted size={12}>{selectedScreen.id} · {selectedScreen.category} · {selectedScreen.durationMs} ms · {selectedScreen.status}</Copy></View>}
          {SYSTEM_SCREENS.map((screen) => (
            <Pressable key={screen.id} onPress={() => { setSelectedScreenId(screen.id); if (screen.category === "state" && PRODUCT_STATES.includes(screen.id as ProximityState)) setDevState(screen.id as ProximityState); }} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Copy weight="600">{screen.label}</Copy><Copy size={11} muted>{screen.category}</Copy></View><Copy size={11} muted>{screen.id}</Copy>
            </Pressable>
          ))}
        </View>
      );
    }

    if (section === "playback") {
      return <View style={{ gap: 10 }}><Choice label={paused ? "Play" : "Pause"} selected={paused} onPress={() => { const next = !paused; setPaused(next); issue({ type: next ? "pause" : "play" }); }} /><Choice label="Reset runtime" onPress={() => { setPaused(false); setRecipeEnabled(false); issue({ type: "reset" }); }} /><Choice label="Center Cherri" onPress={() => issue({ type: "center" })} /><Choice label="Clear mist trails" onPress={() => issue({ type: "clearTrails" })} /><Choice label="Reset Cloud controls" onPress={() => resetCloudSettings()} /></View>;
    }

    return (
      <View style={{ gap: 8 }}>
        <GroupTitle>Live runtime telemetry</GroupTitle>
        {telemetry ? Object.entries(telemetry).map(([key, value]) => <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}><Copy size={12} muted>{key}</Copy><Copy size={12} weight="600">{String(value)}</Copy></View>) : <Copy muted>Waiting for runtime…</Copy>}
        <GroupTitle>Source</GroupTitle>
        <Copy size={12}>LCDPROTO {LCDPROTO_SOURCE_SHA}</Copy>
        <Copy muted size={12}>Canvas 466×466 · centre 233,233 · canonical WebView runtime</Copy>
      </View>
    );
  };

  return (
    <AtmosphericBackground variant="calm">
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top", "left", "right", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 42, height: 42, justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable>
          <View style={{ alignItems: "center" }}><Copy weight="700">Dev Lab</Copy><Copy muted size={10}>LCDPROTO · {LCDPROTO_SOURCE_SHA.slice(0, 7)}</Copy></View>
          <View style={{ width: 42 }} />
        </View>

        <View style={{ alignItems: "center", paddingTop: 2, paddingBottom: 8 }}>
          <GlassOrbFrame size={238}>
            <CloudPreview
              palette={palette}
              proximityState={devState}
              cloudSettings={cloudSettings}
              driverYaw={driverYaw}
              driverPitch={driverPitch}
              showPupils={showPupils}
              interactive
              environment={environment}
              size={230}
              runtimeActive={!paused}
              runtimeCommand={command}
              commandToken={commandToken}
              expressionRecipe={recipeEnabled ? recipe : null}
              debugTelemetry
              onTelemetry={setTelemetry}
            />
          </GlassOrbFrame>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 6 }}>
          <ToolbarButton icon={paused ? "play" : "pause"} label={paused ? "Play" : "Pause"} active={paused} onPress={() => { const next = !paused; setPaused(next); issue({ type: next ? "pause" : "play" }); }} />
          <ToolbarButton icon="locate-outline" label="Center" onPress={() => issue({ type: "center" })} />
          <ToolbarButton icon="refresh" label="Reset" onPress={() => { setPaused(false); setRecipeEnabled(false); issue({ type: "reset" }); }} />
          <ToolbarButton icon="cloud-outline" label="Clear trails" onPress={() => issue({ type: "clearTrails" })} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
          {SECTIONS.map((item) => <Choice key={item.id} label={item.label} selected={section === item.id} onPress={() => setSection(item.id)} />)}
        </ScrollView>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 56, gap: 12 }}>
          <View style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>
            {renderSection()}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AtmosphericBackground>
  );
}
