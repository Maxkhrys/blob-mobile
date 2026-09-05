import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  AccessibilityInfo,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../constants/theme";
import { useFeedback } from "../../services/feedback/FeedbackProvider";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);
  return reduced;
}
export function Screen({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      {header && (
        <View
          style={{
            width: "100%",
            maxWidth: 540,
            alignSelf: "center",
            paddingHorizontal: 24,
            paddingTop: 16,
            gap: 12,
          }}
        >
          {header}
        </View>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 36,
          gap: 24,
          width: "100%",
          maxWidth: 540,
          alignSelf: "center",
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Copy({
  children,
  size = 15,
  muted = false,
  weight = "400",
  style,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  weight?: "400" | "500" | "600" | "700";
  style?: object;
}) {
  const c = useTheme();
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size * 1.4,
        color: muted ? c.textSecondary : c.text,
        fontWeight: weight,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Copy size={32} weight="600" style={{ letterSpacing: -0.8 }}>
        {title}
      </Copy>
      {subtitle && <Copy muted>{subtitle}</Copy>}
    </View>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Copy size={18} weight="600">
        {title}
      </Copy>
      {children}
    </View>
  );
}
export function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: 22, padding: 18, gap: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Tap({
  children,
  onPress,
  label,
  selected,
  disabled,
  style,
  quiet = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  quiet?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const animate = (toValue: number) => {
    if (!reduced)
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        stiffness: 420,
        damping: 32,
        mass: 0.6,
      }).start();
  };
  return (
    <Animated.View
      style={[style, { transform: [{ scale }], opacity: disabled ? 0.45 : 1 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => {
          if (!quiet) feedback();
          onPress();
        }}
        onPressIn={() => animate(0.975)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => ({
          minHeight: 48,
          justifyContent: "center",
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Tap
      label={title}
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: c.primary,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 4,
      }}
    >
      <Copy
        weight="600"
        style={{ color: c.primaryContrast, textAlign: "center" }}
      >
        {title}
      </Copy>
    </Tap>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Copy muted size={13}>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        maxLength={48}
        placeholderTextColor={c.textTertiary}
        {...props}
        style={[
          {
            color: c.text,
            backgroundColor: c.surface,
            borderRadius: 14,
            padding: 16,
            minHeight: 52,
            fontSize: 17,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Avatar({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri?: string;
  size?: number;
}) {
  const c = useTheme();
  return uri ? (
    <Image
      accessibilityLabel={`${name}'s photo`}
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.backgroundSecondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Copy size={size * 0.32} weight="600">
        {name.trim().slice(0, 2).toUpperCase()}
      </Copy>
    </View>
  );
}
export const layout = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
