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
import {
  AtmosphericBackground,
  AtmosphericVariant,
} from "./AtmosphericBackground";

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
  scrollable = true,
  variant = "calm",
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  scrollable?: boolean;
  variant?: AtmosphericVariant;
}) {
  return (
    <AtmosphericBackground variant={variant}>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        {header && (
          <View
            style={{
              width: "100%",
              maxWidth: 540,
              alignSelf: "center",
              paddingHorizontal: 20,
              paddingTop: 12,
              gap: 12,
            }}
          >
            {header}
          </View>
        )}
        {scrollable ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 110, // Ensure bottom content never gets hidden under floating dock
              gap: 20,
              width: "100%",
              maxWidth: 540,
              alignSelf: "center",
            }}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              paddingHorizontal: 18,
              paddingTop: 10,
              paddingBottom: 100, // Safe room for floating glass dock
              width: "100%",
              maxWidth: 540,
              alignSelf: "center",
              justifyContent: "space-between",
            }}
          >
            {children}
          </View>
        )}
      </SafeAreaView>
    </AtmosphericBackground>
  );
}

export function Copy({
  children,
  size = 15,
  muted = false,
  weight = "400",
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  weight?: "400" | "500" | "600" | "700" | "800";
  numberOfLines?: number;
  style?: object;
}) {
  const c = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={{
        fontSize: size,
        lineHeight: size * 1.38,
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
    <View style={{ gap: 6, marginVertical: 4 }}>
      <Copy size={30} weight="700" style={{ letterSpacing: -0.6 }}>
        {title}
      </Copy>
      {subtitle && (
        <Copy muted size={14} style={{ lineHeight: 20 }}>
          {subtitle}
        </Copy>
      )}
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
    <View style={{ gap: 12 }}>
      <Copy size={17} weight="600" style={{ letterSpacing: -0.2 }}>
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
        {
          backgroundColor: c.glass,
          borderRadius: 22,
          padding: 18,
          gap: 14,
          borderWidth: 1,
          borderColor: c.glassBorder,
          shadowColor: "rgba(0, 0, 0, 0.25)",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 2,
        },
        style,
      ]}
    >
      {/* Top subtle highlight rim */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          borderTopWidth: 1,
          borderColor: c.glassBorderHighlight,
          opacity: 0.8,
        }}
      />
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
        mass: 0.5,
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
          minHeight: 44,
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
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
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "accent";
}) {
  const c = useTheme();
  const bg =
    variant === "accent"
      ? c.accent
      : variant === "secondary"
        ? c.glassElevated
        : c.primary;

  const textColor =
    variant === "secondary" ? c.text : c.primaryContrast;

  return (
    <Tap
      label={title}
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: c.glassBorder,
        shadowColor: variant === "accent" ? c.accent : "transparent",
        shadowOpacity: variant === "accent" ? 0.45 : 0,
        shadowRadius: 10,
      }}
    >
      <Copy
        weight="600"
        size={15}
        style={{ color: textColor, textAlign: "center" }}
      >
        {title}
      </Copy>
    </Tap>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
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
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            minHeight: 50,
            fontSize: 16,
            borderWidth: 1,
            borderColor: c.glassBorder,
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
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: c.glassBorderHighlight,
        overflow: "hidden",
      }}
    >
      <Image
        accessibilityLabel={`${name}'s photo`}
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(56, 139, 255, 0.22)",
        borderWidth: 1.5,
        borderColor: c.glassBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Copy size={size * 0.34} weight="700" style={{ color: "#FFFFFF" }}>
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
