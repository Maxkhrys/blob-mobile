import React from "react";
import { Platform, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
import { Copy, layout } from "../ui/Kit";

export function DevSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const c = useTheme();
  const feedback = useFeedback();
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

  return (
    <View
      style={{
        gap: 4,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={layout.between}>
        <Copy size={13}>{label}</Copy>
        <Copy size={12} weight="700" style={{ color: c.accent }}>
          {value.toFixed(decimals)}
        </Copy>
      </View>
      {Platform.OS === "web" ? (
        React.createElement("input", {
          type: "range",
          "aria-label": label,
          min,
          max,
          step,
          value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(Number(event.target.value)),
          onPointerUp: () => feedback("tick"),
          style: {
            width: "100%",
            height: 34,
            margin: 0,
            accentColor: c.accent,
            cursor: "pointer",
          },
        })
      ) : (
        <Slider
          accessibilityLabel={label}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={onChange}
          onSlidingComplete={() => feedback("tick")}
          minimumTrackTintColor={c.accent}
          maximumTrackTintColor={c.border}
          thumbTintColor={c.text}
          style={{ width: "100%", height: 34 }}
        />
      )}
    </View>
  );
}
