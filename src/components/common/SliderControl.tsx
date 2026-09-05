import React, { useState } from "react";
import { View, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { Copy, layout } from "../ui/Kit";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
export function SliderControl({
  value,
  onChange,
  label = "Brightness",
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  icon?: string;
}) {
  const c = useTheme();
  const feedback = useFeedback();
  const [drag, setDrag] = useState<number | null>(null);
  const draft = drag ?? value;
  return (
    <View style={{ gap: 8 }}>
      <View style={layout.between}>
        <Copy>{label}</Copy>
        <Copy muted>{Math.round(draft)}%</Copy>
      </View>
      {Platform.OS === "web" ? React.createElement("input", {
        type: "range", "aria-label": label, min: 0, max: 100, step: 1, value,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
        onPointerUp: () => feedback(),
        onKeyUp: () => feedback(),
        style: { width: "100%", height: 44, margin: 0, accentColor: c.accent, cursor: "pointer" },
      }) : <Slider
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: draft }}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={setDrag}
        onSlidingComplete={(v) => {
          onChange(v);
          setDrag(null);
          feedback();
        }}
        minimumTrackTintColor={c.accent}
        maximumTrackTintColor={c.border}
        thumbTintColor={c.text}
        style={{ height: 44, width: "100%" }}
      />}
    </View>
  );
}
