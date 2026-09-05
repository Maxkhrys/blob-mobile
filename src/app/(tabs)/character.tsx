import React, { useState, useRef, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
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
import { CHERRI_REACTIONS } from "../../domain/expressions/reactions";
import { useTheme } from "../../constants/theme";
export default function CharacterScreen() {
  const { profile, updateProfile, device, setDeviceBrightness } = useAppStore();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [panel, setPanel] = useState<"look" | "reactions">("look");
  const [reaction, setReaction] = useState({ id: "", token: 0 });
  const [playing, setPlaying] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const [presetName, setPresetName] = useState("");
  const [saved, setSaved] = useState(false);
  const trigger = (id: string) => {
    if (timer.current) clearTimeout(timer.current);
    setReaction((r) => ({ id, token: r.token + 1 }));
    setPlaying(id);
    timer.current = setTimeout(() => setPlaying(""), 2300);
  };
  return (
    <Screen
      header={
        <>
          <Copy size={22} weight="600">
            Your Cherri
          </Copy>
          <View style={{ alignItems: "center" }}>
            <CloudPreview
              size={Math.min(width - 72, 216)}
              colourId={profile.characterColour}
              environment={profile.environment}
              reactionId={reaction.id}
              reactionToken={reaction.token}
            />
          </View>
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
            {(["look", "reactions"] as const).map((p) => (
              <Tap
                key={p}
                label={p === "look" ? "Customize" : "Reactions"}
                selected={panel === p}
                onPress={() => setPanel(p)}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: panel === p ? c.surface : "transparent",
                }}
              >
                <Copy weight="600" style={{ textAlign: "center" }}>
                  {p === "look" ? "Customize" : "Reactions"}
                </Copy>
              </Tap>
            ))}
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
            placeholder="Lumi"
          />
          <Section title="Colour">
            <ColourSwatchPicker
              selectedColour={profile.characterColour}
              onSelectColour={(characterColour) =>
                updateProfile({ characterColour })
              }
            />
          </Section>
          <Section title="Environment">
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
          <Section title="Saved looks">
            <Copy muted size={13}>
              Keep a colour and environment together.
            </Copy>
            <Field
              label="Look name"
              value={presetName}
              onChangeText={(t) => {
                setPresetName(t);
                setSaved(false);
              }}
              placeholder="Evening drive"
            />
            <Tap
              label="Save this look"
              disabled={!presetName.trim() || profile.savedPresets.length >= 20}
              onPress={() => {
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
                  onPress={() =>
                    updateProfile({
                      characterColour: p.colourId,
                      environment: p.environment,
                    })
                  }
                  style={{ flex: 1 }}
                >
                  <Copy>{p.name}</Copy>
                </Tap>
                <Tap
                  label={`Delete ${p.name}`}
                  onPress={() =>
                    updateProfile({
                      savedPresets: profile.savedPresets.filter(
                        (x) => x.id !== p.id,
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
      ) : (
        <Section title="Play with Cherri">
          <Copy muted size={13}>
            {playing
              ? `${CHERRI_REACTIONS.find((r) => r.id === playing)?.label}. Then back to chilling.`
              : "Pick a mood. See what happens."}
          </Copy>
          <View style={layout.wrap}>
            {CHERRI_REACTIONS.map((r) => (
              <Tap
                key={r.id}
                label={`Play ${r.label}`}
                selected={playing === r.id}
                onPress={() => trigger(r.id)}
                style={{
                  width: "47%",
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: playing === r.id ? c.accentMuted : c.surface,
                }}
              >
                <Copy size={16} weight="500">
                  {r.label}
                </Copy>
                <Copy muted size={12}>
                  {playing === r.id ? "Playing…" : "Tap to play"}
                </Copy>
              </Tap>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}
