import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useAppStore } from "../store/AppContext";
import {
  Screen,
  Copy,
  Heading,
  Field,
  Button,
  Tap,
  layout,
} from "../components/ui/Kit";
import { CloudPreview } from "../components/character/CloudPreview";
import { ColourSwatchPicker } from "../components/character/ColourSwatchPicker";
import { EnvironmentPicker } from "../components/character/EnvironmentPicker";
import { CloudColourId, EnvironmentId } from "../types";
export default function OnboardingScreen() {
  const { profile, completeOnboarding, reconnectDevice, device } =
    useAppStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.username);
  const [car, setCar] = useState(profile.carName);
  const [cherri, setCherri] = useState(profile.characterName);
  const [colour, setColour] = useState<CloudColourId>(profile.characterColour);
  const [environment, setEnvironment] = useState<EnvironmentId>(
    profile.environment,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const next = async () => {
    if (step < 6) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await reconnectDevice();
      await completeOnboarding({
        username: name.trim(),
        carName: car.trim(),
        characterName: cherri.trim(),
        characterColour: colour,
        environment,
      });
    } catch {
      setError("Pairing paused. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const titles = [
    "A little company.\nEverywhere.",
    "First, you.",
    "What do you drive?",
    "Meet your Cherri.",
    "Make it yours.",
    "Set the scene.",
    "Ready to roll.",
  ];
  return (
    <Screen>
      <View style={layout.between}>
        <Copy weight="700" size={18} style={{ letterSpacing: 2 }}>
          CHERRIPI
        </Copy>
        <Copy muted size={12}>
          {step + 1} / 7
        </Copy>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <CloudPreview
          size={Math.min(width - 72, step === 0 ? 310 : 240)}
          colourId={colour}
          environment={environment}
        />
      </View>
      <Heading
        title={titles[step]}
        subtitle={
          step === 0
            ? "A familiar face. A shared moment. A little more joy on your way."
            : undefined
        }
      />
      {step === 1 && (
        <Field
          label="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
        />
      )}
      {step === 2 && (
        <Field
          label="Your car"
          value={car}
          onChangeText={setCar}
          placeholder="Audi A5"
        />
      )}
      {step === 3 && (
        <Field
          label="Cherri name"
          value={cherri}
          onChangeText={setCherri}
          placeholder="Lumi"
        />
      )}
      {step === 4 && (
        <ColourSwatchPicker
          selectedColour={colour}
          onSelectColour={setColour}
        />
      )}
      {step === 5 && (
        <EnvironmentPicker
          selectedEnvironment={environment}
          onSelectEnvironment={setEnvironment}
        />
      )}
      {step === 6 && (
        <Copy muted>
          Try your CHERRIPI with a demo device. Real hardware pairing comes
          later.
        </Copy>
      )}
      {error && <Copy>{error}</Copy>}
      <Button
        title={
          busy
            ? "Connecting…"
            : step === 0
              ? "Meet your Cherri"
              : step === 6
                ? "Pair demo device"
                : "Continue"
        }
        disabled={
          busy ||
          (step === 1 && !name.trim()) ||
          (step === 2 && !car.trim()) ||
          (step === 3 && !cherri.trim())
        }
        onPress={() => void next()}
      />
      {busy && <Copy muted>{device.state}</Copy>}
      {step > 0 && (
        <Tap label="Back" disabled={busy} onPress={() => setStep(step - 1)}>
          <Copy muted style={{ textAlign: "center" }}>
            Back
          </Copy>
        </Tap>
      )}
    </Screen>
  );
}
