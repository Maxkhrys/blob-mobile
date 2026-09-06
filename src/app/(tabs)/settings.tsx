import React, { useState } from "react";
import { View, Switch, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { useAppStore } from "../../store/AppContext";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { Screen, Avatar } from "../../components/ui/Kit";
import {
  GlassCard,
  GlassPill,
  GlassTextField,
  StatusDot,
} from "../../components/ui/Glass";
import { PrivacyMode, SleepMode } from "../../types";
import { CANONICAL_ENVIRONMENTS } from "../../domain/environments/presets";

function SettingsToggle({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const feedback = useFeedback();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {icon && (
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={15} color="#FFFFFF" />
          </View>
        )}
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(v) => {
          feedback("tick");
          onChange(v);
        }}
        thumbColor={value ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)"}
        trackColor={{ false: "rgba(255, 255, 255, 0.12)", true: "#388BFF" }}
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

  const router = useRouter();
  const feedback = useFeedback();

  const [developer, setDeveloper] = useState(false);
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
      if (!r.canceled && r.assets[0].base64) {
        feedback("success");
        await updateProfile({
          avatarUri: `data:${r.assets[0].mimeType || "image/jpeg"};base64,${r.assets[0].base64}`,
        });
      }
    } catch {
      setError("Could not open photos. Try again.");
    }
  };

  return (
    <Screen variant="calm">
      {/* Screen Title */}
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text style={styles.screenTitle}>Settings</Text>
        <Text style={styles.screenSubtitle}>
          Preferences, device controls, and companion feel.
        </Text>
      </View>

      {/* 1. Profile Section */}
      <GlassCard>
        <Text style={styles.sectionHeader}>Your Profile</Text>
        <View style={styles.avatarRow}>
          <Avatar name={profile.username} uri={profile.avatarUri} size={64} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={() => void pick()}
            style={styles.changePhotoBtn}
          >
            <Ionicons name="camera-outline" size={16} color="#388BFF" />
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <GlassTextField
          label="Your Name"
          value={profile.username}
          onChangeText={(username) => updateProfile({ username })}
        />
        <GlassTextField
          label="Your Car"
          value={profile.carName}
          onChangeText={(carName) => updateProfile({ carName })}
        />
      </GlassCard>

      {/* 2. CHERRIPI Device Section */}
      <GlassCard>
        <Text style={styles.sectionHeader}>CHERRIPI Device</Text>
        <View style={styles.deviceRow}>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <StatusDot
                color={device.state === "Connected" ? "#10B981" : "#F59E0B"}
                size={7}
              />
              <Text style={styles.deviceName}>Hardware Bezel</Text>
            </View>
            <Text style={styles.deviceStatus}>
              {device.state} · {device.battery}% battery
            </Text>
          </View>
          <GlassPill
            onPress={() => {
              feedback("click");
              void reconnectDevice();
            }}
            style={styles.reconnectPill}
          >
            <Ionicons name="refresh" size={13} color="#FFFFFF" />
            <Text style={styles.reconnectText}>Reconnect</Text>
          </GlassPill>
        </View>

        {/* Display Brightness Slider */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.subLabel}>Display Brightness</Text>
            <Text style={styles.subValue}>{device.brightness}%</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="sunny-outline" size={18} color="rgba(240, 244, 252, 0.55)" />
            <Slider
              style={{ flex: 1, height: 32 }}
              minimumValue={10}
              maximumValue={100}
              value={device.brightness}
              onValueChange={(val) => setDeviceBrightness(Math.round(val))}
              minimumTrackTintColor="#388BFF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.16)"
              thumbTintColor="#FFFFFF"
            />
          </View>
        </View>
      </GlassCard>

      {/* 3. Sleep Section */}
      <GlassCard>
        <Text style={styles.sectionHeader}>Sleep Mode</Text>
        {(
          [
            { id: "always-awake", label: "Always awake", icon: "sunny" },
            { id: "sleep-when-parked", label: "Sleep when parked", icon: "car" },
            { id: "scheduled-auto", label: "Automatic", icon: "time" },
          ] as const
        ).map((m) => {
          const isSelected = device.sleepMode === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                feedback("tick");
                setDeviceSleepMode(m.id as SleepMode);
              }}
              style={styles.radioRow}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.iconCircle, isSelected && { backgroundColor: "rgba(56, 139, 255, 0.28)" }]}>
                  <Ionicons
                    name={m.icon as any}
                    size={14}
                    color={isSelected ? "#388BFF" : "#FFFFFF"}
                  />
                </View>
                <Text style={styles.radioLabel}>{m.label}</Text>
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={19} color="#388BFF" />
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </Pressable>
          );
        })}
      </GlassCard>

      {/* 4. App Feel & Theme */}
      <GlassCard>
        <Text style={styles.sectionHeader}>App Feel & Sensory</Text>
        <SettingsToggle
          label="UI Sounds"
          value={profile.uiSounds}
          onChange={(uiSounds) => updateProfile({ uiSounds })}
          icon="volume-high-outline"
        />
        <SettingsToggle
          label="Haptic Feedback"
          value={profile.haptics}
          onChange={(haptics) => updateProfile({ haptics })}
          icon="phone-portrait-outline"
        />

        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={styles.subLabel}>Appearance Theme</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["system", "dark", "light"] as const).map((mode) => {
              const isSelected = profile.themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    feedback("tick");
                    updateProfile({ themeMode: mode });
                  }}
                  style={[
                    styles.themeChip,
                    isSelected && {
                      backgroundColor: "rgba(56, 139, 255, 0.28)",
                      borderColor: "#388BFF",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: isSelected ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)" },
                    ]}
                  >
                    {mode === "system" ? "System" : mode === "dark" ? "Dark Glass" : "Light Glass"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 14 }}>
          <Text style={styles.subLabel}>Home Background</Text>
          <View style={{ gap: 8 }}>
            {CANONICAL_ENVIRONMENTS.map((env) => {
              const currentEnv = (profile.environment || "scenic").toLowerCase();
              const isSelected =
                currentEnv === env.id ||
                (env.id === "scenic" && (currentEnv === "bg-a" || !profile.environment)) ||
                (env.id === "scenic-b" && currentEnv === "bg-b") ||
                (env.id === "zen" && (currentEnv === "sand" || currentEnv === "warm-stone")) ||
                (env.id === "dark" && (currentEnv === "amoled" || currentEnv === "sky"));

              return (
                <Pressable
                  key={env.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${env.label}`}
                  onPress={() => {
                    feedback("tick");
                    updateProfile({ environment: env.id });
                  }}
                  style={[
                    styles.bgRow,
                    isSelected && styles.bgRowSelected,
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View
                      style={[
                        styles.bgSwatch,
                        {
                          backgroundColor: env.bgColor,
                          borderColor: isSelected ? "#388BFF" : "rgba(255, 255, 255, 0.16)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          env.id === "scenic" || env.id === "scenic-b"
                            ? "image-outline"
                            : env.id === "zen"
                              ? "leaf-outline"
                              : "moon-outline"
                        }
                        size={15}
                        color={isSelected ? "#388BFF" : "rgba(255, 255, 255, 0.75)"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.bgTitle}>{env.label}</Text>
                        {env.badge && (
                          <View
                            style={[
                              styles.bgBadge,
                              isSelected && { backgroundColor: "rgba(56, 139, 255, 0.28)" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.bgBadgeText,
                                isSelected && { color: "#93C5FD" },
                              ]}
                            >
                              {env.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.bgDesc} numberOfLines={1}>
                        {env.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={19} color="#388BFF" />
                  ) : (
                    <View style={styles.radioUnchecked} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>

      {/* 5. Notifications */}
      <GlassCard>
        <Text style={styles.sectionHeader}>Presence Alerts</Text>
        {(
          [
            { key: "friendNearby", label: "A friend is nearby", icon: "radio-outline" },
            { key: "friendApproaching", label: "A friend is approaching", icon: "speedometer-outline" },
            { key: "recognizedFriend", label: "A familiar driver crossed paths", icon: "people-outline" },
          ] as const
        ).map((n) => (
          <SettingsToggle
            key={n.key}
            label={n.label}
            value={profile.notifications[n.key]}
            onChange={(v) =>
              updateProfile({
                notifications: { ...profile.notifications, [n.key]: v },
              })
            }
            icon={n.icon as any}
          />
        ))}
      </GlassCard>

      {/* 6. Privacy & Data */}
      <GlassCard>
        <Text style={styles.sectionHeader}>Privacy & Data</Text>
        {(
          [
            { id: "friends-only", label: "Friends only" },
            { id: "discoverable", label: "Discoverable" },
            { id: "invisible", label: "Invisible" },
          ] as { id: PrivacyMode; label: string }[]
        ).map((m) => {
          const isSelected = profile.privacyMode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                feedback("tick");
                updateProfile({ privacyMode: m.id });
              }}
              style={styles.radioRow}
            >
              <Text style={styles.radioLabel}>{m.label}</Text>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={19} color="#388BFF" />
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </Pressable>
          );
        })}

        <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.10)", marginVertical: 4 }} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear memories"
          onPress={() => setConfirmClear(true)}
          style={{ paddingVertical: 4 }}
        >
          <Text style={{ fontSize: 13, color: "rgba(240, 244, 252, 0.60)" }}>
            Clear memories
          </Text>
        </Pressable>

        {confirmClear && (
          <View style={styles.confirmClearBox}>
            <Text style={{ fontSize: 13, color: "#FFFFFF" }}>
              Remove all memories from this phone?
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={() => {
                  feedback("click");
                  void clearEncounters();
                  setConfirmClear(false);
                }}
                style={styles.removeBtn}
              >
                <Text style={{ color: "#F87171", fontSize: 12, fontWeight: "600" }}>
                  Remove memories
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmClear(false)}
                style={styles.keepBtn}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12 }}>Keep memories</Text>
              </Pressable>
            </View>
          </View>
        )}
      </GlassCard>

      {/* 7. Developer Section (Visually distinguished with electric blue accent) */}
      <GlassCard style={styles.developerCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2, flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="terminal" size={16} color="#388BFF" />
              <Text style={styles.devCardTitle}>LCDPROTO Dev Lab</Text>
            </View>
            <Text style={styles.devCardSubtitle}>
              Live Cloud, physics, 3D turn, performances and real-time telemetry
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Dev Lab"
            onPress={() => {
              feedback("click");
              router.push("/dev-lab");
            }}
            style={styles.devLabCta}
          >
            <Text style={styles.devLabCtaText}>Open</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Collapsible advanced options */}
        <Pressable
          onPress={() => setDeveloper(!developer)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 }}
        >
          <Text style={{ fontSize: 12, color: "rgba(240, 244, 252, 0.55)" }}>
            Advanced simulator & testing {developer ? "▲" : "▼"}
          </Text>
        </Pressable>

        {developer && (
          <View style={{ gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.08)" }}>
            <Pressable
              onPress={() => router.push("/simulator")}
              style={styles.devSubOption}
            >
              <Text style={styles.devSubOptionText}>Proximity Simulator</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(240, 244, 252, 0.5)" />
            </Pressable>
            <Pressable
              onPress={() => void resetOnboarding()}
              style={styles.devSubOption}
            >
              <Text style={styles.devSubOptionText}>Replay Onboarding</Text>
              <Ionicons name="reload-outline" size={14} color="rgba(240, 244, 252, 0.5)" />
            </Pressable>
          </View>
        )}
      </GlassCard>

      {/* App Version Footer */}
      <Text style={styles.versionFooter}>
        CHERRIPI • v1.1.0 (Atmospheric Glass)
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 4,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: "rgba(56, 139, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(56, 139, 255, 0.35)",
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#388BFF",
  },
  errorText: {
    fontSize: 12,
    color: "#F87171",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deviceStatus: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.55)",
  },
  reconnectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(56, 139, 255, 0.22)",
  },
  reconnectText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#388BFF",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  radioLabel: {
    fontSize: 14,
    color: "rgba(240, 244, 252, 0.85)",
  },
  radioUnchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 14,
    color: "rgba(240, 244, 252, 0.85)",
  },
  themeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  themeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  confirmClearBox: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    gap: 6,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.20)",
  },
  keepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  developerCard: {
    borderColor: "rgba(56, 139, 255, 0.35)",
    backgroundColor: "rgba(18, 25, 45, 0.75)",
  },
  devCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  devCardSubtitle: {
    fontSize: 11,
    color: "rgba(240, 244, 252, 0.55)",
    lineHeight: 15,
  },
  devLabCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: "#388BFF",
  },
  devLabCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  devSubOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  devSubOptionText: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.80)",
  },
  bgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bgRowSelected: {
    backgroundColor: "rgba(56, 139, 255, 0.16)",
    borderColor: "rgba(56, 139, 255, 0.45)",
  },
  bgSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bgTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bgBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  bgBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(240, 244, 252, 0.70)",
  },
  bgDesc: {
    fontSize: 11,
    color: "rgba(240, 244, 252, 0.50)",
    marginTop: 1,
  },
  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(240, 244, 252, 0.35)",
    marginVertical: 12,
  },
});
