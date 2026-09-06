import React from "react";
import { View } from "react-native";
import { EnvironmentId } from "../../types";
import { CANONICAL_ENVIRONMENTS } from "../../domain/environments/presets";
import { Copy, Tap, layout } from "../ui/Kit";

export function EnvironmentPicker({
  selectedEnvironment,
  onSelectEnvironment,
  value,
  onChange,
}: {
  selectedEnvironment?: EnvironmentId;
  onSelectEnvironment?: (id: EnvironmentId) => void;
  value?: EnvironmentId;
  onChange?: (id: EnvironmentId) => void;
}) {
  const activeEnv = selectedEnvironment ?? value ?? "dark-void";
  const handleSelect = onSelectEnvironment ?? onChange ?? (() => {});

  return (
    <View style={[layout.wrap, { gap: 10 }]}>
      {CANONICAL_ENVIRONMENTS.map((e) => {
        const id = e.id === "warm" ? "warm-glow" : (e.id as EnvironmentId);
        const active = activeEnv === id;
        return (
          <Tap
            key={id}
            label={`Select ${e.label} environment`}
            selected={active}
            onPress={() => handleSelect(id)}
            style={{
              width: "48%",
              backgroundColor: active
                ? "rgba(56, 139, 255, 0.18)"
                : "rgba(255, 255, 255, 0.06)",
              borderRadius: 18,
              padding: 12,
              borderWidth: 1.2,
              borderColor: active ? "#388BFF" : "rgba(255, 255, 255, 0.12)",
            }}
          >
            <View style={[layout.between, { minHeight: 44 }]}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#0B0E17",
                  padding: 3,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: e.screenColour,
                  }}
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 8 }}>
                <Copy size={13} weight={active ? "700" : "500"}>
                  {e.label}
                </Copy>
              </View>
            </View>
          </Tap>
        );
      })}
    </View>
  );
}
