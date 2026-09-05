import React from "react";
import { View } from "react-native";
import { CloudColourId } from "../../types";
import { CANONICAL_CLOUD_PRESETS } from "../../domain/palettes/presets";
import { Copy, Tap, layout } from "../ui/Kit";
import { useTheme } from "../../constants/theme";
const ids: CloudColourId[] = [
  "white",
  "blue",
  "cool-mist",
  "lavender",
  "mint",
  "pink",
  "peach",
  "baby-blue",
];
export function ColourSwatchPicker({
  selectedColour,
  onSelectColour,
}: {
  selectedColour: CloudColourId;
  onSelectColour: (id: CloudColourId) => void;
}) {
  const c = useTheme();
  return (
    <View style={[layout.wrap, { gap: 14 }]}>
      {CANONICAL_CLOUD_PRESETS.map((p, i) => (
        <Tap
          key={p.id}
          label={`Select ${p.label}`}
          selected={selectedColour === ids[i]}
          onPress={() => onSelectColour(ids[i])}
          style={{ width: 60 }}
        >
          <View style={{ alignItems: "center", gap: 7 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                padding: 4,
                borderWidth: 2,
                borderColor: selectedColour === ids[i] ? c.text : "transparent",
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: p.colour.body,
                  borderWidth: 1,
                  borderColor: p.colour.coreTint,
                }}
              />
              {selectedColour === ids[i] && (
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#252322",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Copy size={12} style={{ color: "#fff" }}>
                    ✓
                  </Copy>
                </View>
              )}
            </View>
            <Copy size={12}>
              {p.label === "Mist / Teal" ? "Mist" : p.label}
            </Copy>
          </View>
        </Tap>
      ))}
    </View>
  );
}
