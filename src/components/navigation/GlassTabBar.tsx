import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFeedback } from "../../services/feedback/FeedbackProvider";

export interface GlassTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarAccessibilityLabel?: string } }
  >;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string) => void;
  };
}

const TAB_ICONS: Record<
  string,
  {
    focused: keyof typeof Ionicons.glyphMap;
    normal: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  index: { focused: "home", normal: "home-outline", label: "Home" },
  drivers: { focused: "people", normal: "people-outline", label: "Drivers" },
  character: { focused: "cloud", normal: "cloud-outline", label: "Cherri" },
  encounters: { focused: "time", normal: "time-outline", label: "Memories" },
  settings: { focused: "settings", normal: "settings-outline", label: "Settings" },
};

export function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();

  // Floating dock sits nicely above bottom safe area
  const bottomMargin = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={[styles.outerWrapper, { bottom: bottomMargin }]}>
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: "rgba(16, 22, 38, 0.78)",
            borderColor: "rgba(255, 255, 255, 0.16)",
            shadowColor: "#000000",
          },
        ]}
      >
        {/* Top subtle inner specular highlight */}
        <View
          pointerEvents="none"
          style={[styles.dockHighlight, { borderColor: "rgba(255, 255, 255, 0.28)" }]}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const meta = TAB_ICONS[route.name] || {
            focused: "cube",
            normal: "cube-outline",
            label: options.title || route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              feedback("tick");
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel || meta.label}
              onPress={onPress}
              style={styles.tabItem}
            >
              {isFocused ? (
                <View style={styles.activeIconContainer}>
                  {/* Glowing electric blue halo circle */}
                  <View style={styles.activeGlowHalo} />
                  <View style={styles.activeCircle}>
                    <Ionicons name={meta.focused} size={19} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <View style={styles.inactiveIconContainer}>
                  <Ionicons
                    name={meta.normal}
                    size={21}
                    color="rgba(240, 244, 252, 0.65)"
                  />
                </View>
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? "#FFFFFF" : "rgba(240, 244, 252, 0.55)",
                    fontWeight: isFocused ? "600" : "400",
                  },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    alignItems: "center",
    zIndex: 100,
  },
  dockContainer: {
    width: "100%",
    maxWidth: 500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 34,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  dockHighlight: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 2,
  },
  activeIconContainer: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlowHalo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(56, 139, 255, 0.35)",
  },
  activeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#388BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#388BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  inactiveIconContainer: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
