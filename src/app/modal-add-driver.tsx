import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Share } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../store/AppContext";
import {
  Screen,
  Heading,
  Copy,
  Field,
  Button,
  Tap,
  Avatar,
} from "../components/ui/Kit";
export default function AddDriverModal() {
  const { addDriver, profile } = useAppStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [car, setCar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string>();
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!r.canceled && r.assets[0].base64)
      setPhoto(
        `data:${r.assets[0].mimeType || "image/jpeg"};base64,${r.assets[0].base64}`,
      );
  };
  const add = async () => {
    setBusy(true);
    try {
      await addDriver(name.trim(), car.trim() || "Car not added", photo);
      router.back();
    } catch {
      setError("Could not save driver. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading
        title="More familiar faces"
        subtitle="Your people. Your shared little moments."
      />
      <Tap
        label="Share an invitation"
        onPress={() => {
          void Share.share({
            message: `Join me on CHERRIPI. ${profile.username} would love to cross paths with you.`,
          }).catch(() => setError("Could not open sharing."));
        }}
      >
        <Copy weight="600">Share an invitation ↗</Copy>
      </Tap>
      <Copy muted>
        For now, add a demo driver to try encounters. Invitations don’t connect
        accounts yet.
      </Copy>
      <Avatar name={name || "Driver"} uri={photo} />
      <Tap
        label="Add driver photo"
        onPress={() =>
          void pick().catch(() => setError("Could not open photos."))
        }
      >
        <Copy>Add photo</Copy>
      </Tap>
      <Field
        label="Driver name"
        value={name}
        onChangeText={setName}
        placeholder="Alex"
      />
      <Field
        label="Car"
        value={car}
        onChangeText={setCar}
        placeholder="Audi RS3"
      />
      {error && <Copy>{error}</Copy>}
      <Button
        title={busy ? "Adding…" : "Add demo driver"}
        disabled={!name.trim() || busy}
        onPress={() => void add()}
      />
      <Tap label="Cancel" onPress={() => router.back()}>
        <Copy style={{ textAlign: "center" }}>Cancel</Copy>
      </Tap>
    </Screen>
  );
}
