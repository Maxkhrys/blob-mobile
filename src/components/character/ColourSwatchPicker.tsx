import React from "react";
import { View, StyleSheet } from "react-native";
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
  value,
  onChange,
}: {
  selectedColour?: CloudColourId;
  onSelectColour?: (id: CloudColourId) => void;
  value?: CloudColourId;
  onChange?: (id: CloudColourId) => void;
}) {
  const c = useTheme();
  const activeColor = selectedColour ?? value ?? "white";
  const handleSelect = onSelectColour ?? onChange ?? (() => {});

  return (
    <View style={[layout.wrap, { gap: 14 }]}>
      {CANONICAL_CLOUD_PRESETS.map((p, i) => {
        const isSelected = activeColor === ids[i];
        return (
          <Tap
            key={p.id}
            label={`Select ${p.label}`}
            selected={isSelected}
            onPress={() => handleSelect(ids[i])}
            style={{ width: 62 }}
          >
            <View style={{ alignItems: "center", gap: 6 }}>
              <View
                style={[
                  styles.swatchOuter,
                  {
                    borderColor: isSelected
                      ? "#388BFF"
                      : "rgba(255, 255, 255, 0.20)",
                    shadowColor: isSelected ? "#388BFF" : "transparent",
                    shadowOpacity: isSelected ? 0.6 : 0,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.swatchInner,
                    {
                      backgroundColor: p.colour.body,
                      borderColor: p.colour.coreTint,
                    },
                  ]}
                />
                {isSelected && (
                  <View style={styles.checkIndicator}>
                    <Copy size={11} weight="700" style={{ color: "#FFFFFF" }}>
                      ✓
                    </Copy>
                  </View>
                )}
              </View>
              <Copy
                size={11}
                weight={isSelected ? "700" : "500"}
                style={{
                  color: isSelected ? "#FFFFFF" : c.textSecondary,
                  textAlign: "center",
                }}
              >
                {p.label}
              </Copy>
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  swatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 3,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchInner: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1,
  },
  checkIndicator: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#388BFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
