import React, { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store/AppContext";
import { Screen } from "../components/ui/Kit";
import {
  GlassCard,
  GlassTextField,
  GlowButton,
  GlassOrbFrame,
} from "../components/ui/Glass";
import { CloudPreview } from "../components/character/CloudPreview";
import { ColourSwatchPicker } from "../components/character/ColourSwatchPicker";
import { EnvironmentPicker } from "../components/character/EnvironmentPicker";
import { CloudColourId, EnvironmentId } from "../types";
import { useFeedback } from "../services/feedback/FeedbackProvider";

export default function OnboardingScreen() {
  const { profile, completeOnboarding, reconnectDevice } = useAppStore();
  const feedback = useFeedback();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.username);
  const [car, setCar] = useState(profile.carName);
  const [cherri, setCherri] = useState(profile.characterName);
  const [colour, setColour] = useState<CloudColourId>(profile.characterColour);
  const [environment, setEnvironment] = useState<EnvironmentId>(profile.environment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();

  const next = async () => {
    feedback("click");
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
    "First, your name.",
    "What do you drive?",
    "Meet your Cherri.",
    "Choose a look.",
    "Set the scene.",
    "Ready to roll.",
  ];

  const subtitles = [
    "A familiar face. A shared moment. A little more joy on your way.",
    "Your profile for friends who cross paths with you.",
    "Help friends recognize your presence on the road.",
    "Give your companion creature a unique name.",
    "Pick an aesthetic palette that matches your car's interior.",
    "Choose the atmospheric ambient display tone.",
    "Pair with your simulated hardware device to begin.",
  ];

  const previewSize = Math.min(width - 80, step === 0 ? 250 : 210);

  return (
    <Screen variant="bright">
      {/* Top Header: Brand & Step Progress Indicator */}
      <View style={styles.topHeader}>
        <Text style={styles.brandTitle}>CHERRIPI</Text>
        <View style={styles.progressContainer}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    i <= step ? "#388BFF" : "rgba(255, 255, 255, 0.18)",
                  width: i === step ? 18 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Live Cherri Hero in Glass Orb */}
      <View style={{ alignItems: "center", paddingVertical: 8 }}>
        <GlassOrbFrame size={previewSize}>
          <CloudPreview
            size={previewSize - 10}
            colourId={colour}
            environment={environment}
          />
        </GlassOrbFrame>
      </View>

      {/* Headline & Subtitle */}
      <View style={{ gap: 4, marginVertical: 4 }}>
        <Text style={styles.stepTitle}>{titles[step]}</Text>
        <Text style={styles.stepSubtitle}>{subtitles[step]}</Text>
      </View>

      {/* Step Form Content */}
      <View style={{ gap: 14 }}>
        {step === 1 && (
          <GlassCard>
            <GlassTextField
              label="Your Name"
              value={name}
              onChangeText={setName}
              autoComplete="given-name"
              placeholder="e.g. Alex"
            />
          </GlassCard>
        )}

        {step === 2 && (
          <GlassCard>
            <GlassTextField
              label="Your Car"
              value={car}
              onChangeText={setCar}
              placeholder="e.g. Porsche 911"
            />
          </GlassCard>
        )}

        {step === 3 && (
          <GlassCard>
            <GlassTextField
              label="Companion Name"
              value={cherri}
              onChangeText={setCherri}
              placeholder="e.g. Lumi"
            />
          </GlassCard>
        )}

        {step === 4 && (
          <GlassCard>
            <ColourSwatchPicker
              selectedColour={colour}
              onSelectColour={setColour}
            />
          </GlassCard>
        )}

        {step === 5 && (
          <GlassCard>
            <EnvironmentPicker
              selectedEnvironment={environment}
              onSelectEnvironment={setEnvironment}
            />
          </GlassCard>
        )}

        {step === 6 && (
          <GlassCard style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600" }}>
              Ready to pair
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(240, 244, 252, 0.65)", lineHeight: 18 }}>
              Try your CHERRIPI companion now with the live simulated hardware device.
            </Text>
          </GlassCard>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Action Button */}
        <GlowButton
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
          icon={<Ionicons name="arrow-forward" size={17} color="#FFFFFF" />}
        />

        {/* Back Button */}
        {step > 0 && (
          <Pressable
            disabled={busy}
            onPress={() => {
              feedback("tick");
              setStep(step - 1);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2.2,
    color: "#FFFFFF",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "rgba(240, 244, 252, 0.65)",
    lineHeight: 20,
  },
  backBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(240, 244, 252, 0.55)",
  },
  errorText: {
    fontSize: 13,
    color: "#F87171",
    textAlign: "center",
  },
});
