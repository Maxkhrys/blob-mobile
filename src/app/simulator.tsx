import React, { useState } from "react";
import { View } from "react-native";
import { useAppStore } from "../store/AppContext";
import {
  Screen,
  Heading,
  Copy,
  Tap,
  Section,
  layout,
} from "../components/ui/Kit";
import { CloudPreview } from "../components/character/CloudPreview";
import { CANONICAL_PRODUCT_STATES } from "../domain/productStates/stateEmotionMap";
import { useTheme } from "../constants/theme";
export default function Simulator() {
  const { profile, drivers, proximity, setProximityState, resetProximity } =
    useAppStore();
  const c = useTheme();
  const [driver, setDriver] = useState(drivers[0]?.id || "alex");
  const [direction, setDirection] = useState<
    "left" | "right" | "ahead" | "behind"
  >("ahead");
  return (
    <Screen>
      <Heading
        title="Proximity simulator"
        subtitle="Developer tools · local demo events"
      />
      <View style={{ alignItems: "center" }}>
        <CloudPreview
          size={250}
          colourId={profile.characterColour}
          environment={profile.environment}
          proximityState={proximity.state}
          driverYaw={
            direction === "left" ? -0.5 : direction === "right" ? 0.5 : 0
          }
        />
      </View>
      <Section title="Driver">
        <View style={layout.wrap}>
          {drivers.map((d) => (
            <Tap
              key={d.id}
              label={`Choose ${d.name}`}
              selected={driver === d.id}
              onPress={() => setDriver(d.id)}
              style={{
                paddingHorizontal: 12,
                backgroundColor: driver === d.id ? c.accentMuted : c.surface,
                borderRadius: 12,
              }}
            >
              <Copy>{d.name}</Copy>
            </Tap>
          ))}
        </View>
      </Section>
      <Section title="Direction">
        <View style={layout.wrap}>
          {(["left", "right", "ahead", "behind"] as const).map((d) => (
            <Tap
              key={d}
              label={d}
              selected={direction === d}
              onPress={() => setDirection(d)}
              style={{
                paddingHorizontal: 12,
                backgroundColor: direction === d ? c.accentMuted : c.surface,
                borderRadius: 12,
              }}
            >
              <Copy>{d}</Copy>
            </Tap>
          ))}
        </View>
      </Section>
      <Section title="Canonical states">
        <View style={layout.wrap}>
          {CANONICAL_PRODUCT_STATES.map((s) => (
            <Tap
              key={s.id}
              label={`Simulate ${s.id}`}
              selected={proximity.state === s.id}
              onPress={() =>
                setProximityState(
                  s.id,
                  driver,
                  drivers.find((d) => d.id === driver)?.name,
                  direction,
                )
              }
              style={{
                width: "47%",
                padding: 12,
                backgroundColor:
                  proximity.state === s.id ? c.accentMuted : c.surface,
                borderRadius: 12,
              }}
            >
              <Copy size={13}>{s.id}</Copy>
            </Tap>
          ))}
        </View>
      </Section>
      <Tap label="Reset simulation" onPress={resetProximity}>
        <Copy>Reset simulation</Copy>
      </Tap>
    </Screen>
  );
}
