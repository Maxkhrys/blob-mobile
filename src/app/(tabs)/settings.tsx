import React, { useState } from "react";
import { View, Switch } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "../../store/AppContext";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { SliderControl } from "../../components/common/SliderControl";
import {
  Screen,
  Heading,
  Section,
  Copy,
  Surface,
  Field,
  Tap,
  Avatar,
  layout,
} from "../../components/ui/Kit";
import { PrivacyMode, SleepMode } from "../../types";
import { CharacterStudioModal } from "../../components/character/CharacterStudioModal";
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useTheme();
  const feedback = useFeedback();
  return (
    <View style={layout.between}>
      <Copy style={{ flex: 1 }}>{label}</Copy>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(v) => {
          onChange(v);
          feedback();
        }}
        thumbColor={c.surface}
        trackColor={{ false: c.border, true: c.accent }}
      />
    </View>
  );
}
export default function SettingsScreen() {
  const {
    profile,
    updateProfile,
    device,
    setDeviceBrightness,
    setDeviceSleepMode,
    reconnectDevice,
    resetOnboarding,
    clearEncounters,
  } = useAppStore();
  const c = useTheme();
  const router = useRouter();
  const [developer, setDeveloper] = useState(false);
  const [studioVisible, setStudioVisible] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const pick = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!r.canceled && r.assets[0].base64)
        await updateProfile({
          avatarUri: `data:${r.assets[0].mimeType || "image/jpeg"};base64,${r.assets[0].base64}`,
        });
    } catch {
      setError("Could not open photos. Try again.");
    }
  };
  return (
    <Screen>
      <Heading title="Settings" />
      <Section title="Your profile">
        <View style={layout.row}>
          <Avatar name={profile.username} uri={profile.avatarUri} size={60} />
          <Tap label="Change profile photo" onPress={() => void pick()}>
            <Copy style={{ color: c.accent }}>Change photo</Copy>
          </Tap>
        </View>
        {error && <Copy muted>{error}</Copy>}
        <Field
          label="Your name"
          value={profile.username}
          onChangeText={(username) => updateProfile({ username })}
        />
        <Field
          label="Your car"
          value={profile.carName}
          onChangeText={(carName) => updateProfile({ carName })}
        />
      </Section>
      <Section title="Your device">
        <Surface>
          <View style={layout.between}>
            <View>
              <Copy weight="600">CHERRIPI</Copy>
              <Copy muted size={12}>
                {device.state} · {device.battery}% battery
              </Copy>
            </View>
            <Tap
              label="Reconnect Cherri"
              onPress={() => void reconnectDevice()}
              disabled={device.state === "Reconnecting"}
            >
              <Copy style={{ color: c.accent }}>Reconnect</Copy>
            </Tap>
          </View>
          <SliderControl
            value={device.brightness}
            onChange={setDeviceBrightness}
          />
          <Copy muted size={12}>
            Demo device · Pairing is simulated
          </Copy>
        </Surface>
      </Section>
      <Section title="Sleep">
        <Surface>
          {(
            [
              { id: "always-awake", label: "Always awake" },
              { id: "sleep-when-parked", label: "Sleep when parked" },
              { id: "scheduled-auto", label: "Automatic" },
            ] as { id: SleepMode; label: string }[]
          ).map((m) => (
            <Tap
              key={m.id}
              label={m.label}
              selected={device.sleepMode === m.id}
              onPress={() => setDeviceSleepMode(m.id)}
            >
              <View style={layout.between}>
                <Copy>{m.label}</Copy>
                {device.sleepMode === m.id && <Copy>✓</Copy>}
              </View>
            </Tap>
          ))}
        </Surface>
      </Section>
      <Section title="App feel">
        <Surface>
          <Toggle
            label="UI Sounds"
            value={profile.uiSounds}
            onChange={(uiSounds) => updateProfile({ uiSounds })}
          />
          <Toggle
            label="Haptics"
            value={profile.haptics}
            onChange={(haptics) => updateProfile({ haptics })}
          />
          <Copy muted size={12}>
            Quiet feedback for little decisions.
          </Copy>
          <View style={layout.wrap}>
            {(["system", "light", "dark"] as const).map((mode) => (
              <Tap
                key={mode}
                label={`${mode} theme`}
                selected={profile.themeMode === mode}
                onPress={() => updateProfile({ themeMode: mode })}
                style={{
                  flex: 1,
                  minWidth: 72,
                  borderRadius: 12,
                  backgroundColor:
                    profile.themeMode === mode
                      ? c.backgroundSecondary
                      : "transparent",
                }}
              >
                <Copy style={{ textAlign: "center" }}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Copy>
              </Tap>
            ))}
          </View>
        </Surface>
      </Section>
      <Section title="Notifications">
        <Surface>
          {(
            [
              { key: "friendNearby", label: "A friend is nearby" },
              { key: "friendApproaching", label: "A friend is approaching" },
              { key: "recognizedFriend", label: "A familiar driver" },
            ] as const
          ).map((n) => (
            <Toggle
              key={n.key}
              label={n.label}
              value={profile.notifications[n.key]}
              onChange={(v) =>
                updateProfile({
                  notifications: { ...profile.notifications, [n.key]: v },
                })
              }
            />
          ))}
          <Copy muted size={12}>
            Preferences saved for your device. Push notifications are not active
            yet.
          </Copy>
        </Surface>
      </Section>
      <Section title="Privacy">
        <Surface>
          {(
            [
              { id: "friends-only", label: "Friends only" },
              { id: "discoverable", label: "Discoverable" },
              { id: "invisible", label: "Invisible" },
            ] as { id: PrivacyMode; label: string }[]
          ).map((m) => (
            <Tap
              key={m.id}
              label={m.label}
              selected={profile.privacyMode === m.id}
              onPress={() => updateProfile({ privacyMode: m.id })}
            >
              <View style={layout.between}>
                <Copy>{m.label}</Copy>
                {profile.privacyMode === m.id && <Copy>✓</Copy>}
              </View>
            </Tap>
          ))}
          <Copy muted size={12}>
            No live location tracking. Preferences apply when connected services
            become available.
          </Copy>
        </Surface>
        <Tap label="Clear memories" onPress={() => setConfirmClear(true)}>
          <Copy muted>Clear memories</Copy>
        </Tap>
        {confirmClear && (
          <Surface>
            <Copy>Remove all memories from this phone?</Copy>
            <Tap
              label="Confirm clear memories"
              onPress={() => {
                void clearEncounters();
                setConfirmClear(false);
              }}
            >
              <Copy style={{ color: c.danger }}>Remove memories</Copy>
            </Tap>
            <Tap label="Keep memories" onPress={() => setConfirmClear(false)}>
              <Copy>Keep memories</Copy>
            </Tap>
          </Surface>
        )}
      </Section>
      <Section title="Developer & Character Lab">
        <Surface>
          <View style={layout.between}>
            <View style={{ gap: 2, flex: 1 }}>
              <Copy weight="600">Character Studio & Lab</Copy>
              <Copy muted size={12}>
                All 30+ physical sliders & volumetric lobe controls
              </Copy>
            </View>
            <Tap label="Open Character Studio" onPress={() => setStudioVisible(true)}>
              <Copy style={{ color: c.accent, fontWeight: "700" }}>Open Lab</Copy>
            </Tap>
          </View>
        </Surface>
      </Section>
      <Tap label="Developer section" onPress={() => setDeveloper(!developer)}>
        <Copy muted>Advanced options {developer ? "↑" : "↓"}</Copy>
      </Tap>
      {developer && (
        <Surface>
          <Tap
            label="Proximity simulator"
            onPress={() => router.push("/simulator")}
          >
            <Copy>Proximity simulator</Copy>
          </Tap>
          <Tap label="Replay onboarding" onPress={() => void resetOnboarding()}>
            <Copy>Replay onboarding</Copy>
          </Tap>
          <Copy muted size={12}>
            Local demo services · {device.firmwareVersion}
          </Copy>
        </Surface>
      )}
      <Copy muted size={12} style={{ textAlign: "center" }}>
        CHERRIPI · 1.1
      </Copy>
      <CharacterStudioModal
        visible={studioVisible}
        onClose={() => setStudioVisible(false)}
      />
    </Screen>
  );
}
