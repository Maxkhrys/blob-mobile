import React from "react";
import { View } from "react-native";
import { EnvironmentId } from "../../types";
import { CANONICAL_ENVIRONMENTS } from "../../domain/environments/presets";
import { Copy, Tap, layout } from "../ui/Kit";
import { useTheme } from "../../constants/theme";
export function EnvironmentPicker({
  selectedEnvironment,
  onSelectEnvironment,
}: {
  selectedEnvironment: EnvironmentId;
  onSelectEnvironment: (id: EnvironmentId) => void;
}) {
  const c = useTheme();
  return (
    <View style={layout.wrap}>
      {CANONICAL_ENVIRONMENTS.map((e) => {
        const id = e.id === "warm" ? "warm-glow" : (e.id as EnvironmentId);
        const active = selectedEnvironment === id;
        return (
          <Tap
            key={id}
            label={`Select ${e.label} environment`}
            selected={active}
            onPress={() => onSelectEnvironment(id)}
            style={{
              width: "47%",
              backgroundColor: active ? c.backgroundSecondary : c.surface,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <View style={[layout.between, { minHeight: 48 }]}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#161514",
                  padding: 3,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    backgroundColor: e.screenColour,
                  }}
                />
              </View>
              <Copy size={13} weight={active ? "600" : "400"}>
                {e.label}
              </Copy>
              {active && <Copy>✓</Copy>}
            </View>
          </Tap>
        );
      })}
    </View>
  );
}
