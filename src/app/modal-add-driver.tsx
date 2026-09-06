import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Share, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store/AppContext";
import { Screen, Avatar } from "../components/ui/Kit";
import {
  GlassCard,
  GlassTextField,
  GlowButton,
  GlassCircleButton,
} from "../components/ui/Glass";
import { useFeedback } from "../services/feedback/FeedbackProvider";

export default function AddDriverModal() {
  const { addDriver, profile } = useAppStore();
  const router = useRouter();
  const feedback = useFeedback();

  const [name, setName] = useState("");
  const [car, setCar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string>();

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
        setPhoto(
          `data:${r.assets[0].mimeType || "image/jpeg"};base64,${r.assets[0].base64}`,
        );
      }
    } catch {
      setError("Could not open photos.");
    }
  };

  const add = async () => {
    if (!name.trim()) {
      setError("Please enter a driver name.");
      return;
    }
    setBusy(true);
    try {
      feedback("success");
      await addDriver(name.trim(), car.trim() || "Car not added", photo);
      router.back();
    } catch {
      setError("Could not save driver. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen variant="calm">
      {/* Top Grabber & Header */}
      <View style={styles.sheetHeader}>
        <View style={styles.grabber} />
        <View style={styles.headerTitleRow}>
          <View style={{ gap: 2 }}>
            <Text style={styles.screenTitle}>Add Driver</Text>
            <Text style={styles.screenSubtitle}>
              Your people. Your shared little moments.
            </Text>
          </View>
          <GlassCircleButton
            label="Cancel"
            size={36}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </GlassCircleButton>
        </View>
      </View>

      {/* Share Invitation Banner */}
      <GlassCard level="subtle" style={styles.inviteCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={styles.inviteTitle}>Share an invitation ↗</Text>
            <Text style={styles.inviteDesc}>
              Invite friends to pair their CHERRIPI.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share invite"
            onPress={() => {
              feedback("click");
              void Share.share({
                message: `Join me on CHERRIPI. ${profile.username} would love to cross paths with you.`,
              }).catch(() => setError("Could not open sharing."));
            }}
            style={styles.shareIconBtn}
          >
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </GlassCard>

      {/* Driver Form Card */}
      <GlassCard style={{ gap: 16 }}>
        {/* Avatar Upload */}
        <View style={styles.avatarRow}>
          <Avatar name={name || "Driver"} uri={photo} size={64} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add driver photo"
            onPress={() => void pick()}
            style={styles.photoUploadBtn}
          >
            <Ionicons name="camera-outline" size={16} color="#388BFF" />
            <Text style={styles.photoUploadText}>
              {photo ? "Change photo" : "Add photo"}
            </Text>
          </Pressable>
        </View>

        {/* Input Fields */}
        <GlassTextField
          label="Driver Name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError("");
          }}
          placeholder="e.g. Alex"
        />

        <GlassTextField
          label="Car Model"
          value={car}
          onChangeText={setCar}
          placeholder="e.g. Audi RS3"
        />

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </GlassCard>

      {/* Submit Button */}
      <GlowButton
        title={busy ? "Adding Driver…" : "Add Driver"}
        disabled={busy}
        onPress={() => void add()}
        icon={<Ionicons name="person-add" size={17} color="#FFFFFF" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    gap: 12,
    marginBottom: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
    alignSelf: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  inviteCard: {
    padding: 14,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#388BFF",
  },
  inviteDesc: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.55)",
  },
  shareIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(56, 139, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 4,
  },
  photoUploadBtn: {
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
  photoUploadText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#388BFF",
  },
  errorText: {
    fontSize: 12,
    color: "#F87171",
  },
});
