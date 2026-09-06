import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../store/AppContext";
import { Screen, Copy, Tap, layout } from "../components/ui/Kit";
import { GlassCard, GlassOrbFrame } from "../components/ui/Glass";
import { CloudPreview } from "../components/character/CloudPreview";
import { CANONICAL_PRODUCT_STATES } from "../domain/productStates/stateEmotionMap";

export default function Simulator() {
  const { profile, drivers, proximity, setProximityState, resetProximity } =
    useAppStore();
  const [driver, setDriver] = useState(drivers[0]?.id || "alex");
  const [direction, setDirection] = useState<
    "left" | "right" | "ahead" | "behind"
  >("ahead");

  return (
    <Screen variant="calm">
      <View style={{ gap: 3, marginBottom: 4 }}>
        <Text style={styles.title}>Proximity Simulator</Text>
        <Text style={styles.subtitle}>Developer demo · local proximity events</Text>
      </View>

      <View style={{ alignItems: "center", marginVertical: 6 }}>
        <GlassOrbFrame size={220}>
          <CloudPreview
            size={210}
            colourId={profile.characterColour}
            environment={profile.environment}
            proximityState={proximity.state}
            driverYaw={
              direction === "left" ? -0.5 : direction === "right" ? 0.5 : 0
            }
          />
        </GlassOrbFrame>
      </View>

      <GlassCard>
        <Text style={styles.cardHeader}>Target Driver</Text>
        <View style={layout.wrap}>
          {drivers.map((d) => (
            <Tap
              key={d.id}
              label={`Choose ${d.name}`}
              selected={driver === d.id}
              onPress={() => setDriver(d.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor:
                  driver === d.id ? "rgba(56, 139, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  driver === d.id ? "#388BFF" : "rgba(255, 255, 255, 0.12)",
              }}
            >
              <Copy weight={driver === d.id ? "700" : "500"}>{d.name}</Copy>
            </Tap>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardHeader}>Relative Direction</Text>
        <View style={layout.wrap}>
          {(["left", "right", "ahead", "behind"] as const).map((d) => (
            <Tap
              key={d}
              label={d}
              selected={direction === d}
              onPress={() => setDirection(d)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor:
                  direction === d ? "rgba(56, 139, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  direction === d ? "#388BFF" : "rgba(255, 255, 255, 0.12)",
              }}
            >
              <Copy weight={direction === d ? "700" : "500"}>{d}</Copy>
            </Tap>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardHeader}>Canonical Product States</Text>
        <View style={layout.wrap}>
          {CANONICAL_PRODUCT_STATES.map((s) => {
            const active = proximity.state === s.id;
            return (
              <Tap
                key={s.id}
                label={`Simulate ${s.id}`}
                selected={active}
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
                  backgroundColor: active
                    ? "rgba(56, 139, 255, 0.25)"
                    : "rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.12)",
                }}
              >
                <Copy size={13} weight={active ? "700" : "500"}>
                  {s.id}
                </Copy>
              </Tap>
            );
          })}
        </View>
      </GlassCard>

      <Tap
        label="Reset simulation"
        onPress={resetProximity}
        style={{
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.15)",
        }}
      >
        <Copy weight="600" style={{ color: "#388BFF" }}>
          Reset Simulation
        </Copy>
      </Tap>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 6,
  },
});
