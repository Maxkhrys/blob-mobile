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

export const TAB_BAR_HEIGHT = 56;

export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 24;
}

export function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();

  // Floating dock sits nicely above bottom safe area
  const bottomMargin = Math.max(insets.bottom, 10);

  return (
    <View pointerEvents="box-none" style={[styles.outerWrapper, { bottom: bottomMargin }]}>
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: "rgba(20, 28, 50, 0.48)",
            borderColor: "rgba(255, 255, 255, 0.22)",
            shadowColor: "#000000",
          },
        ]}
      >
        {/* Top subtle inner specular highlight */}
        <View
          pointerEvents="none"
          style={[styles.dockHighlight, { borderColor: "rgba(255, 255, 255, 0.35)" }]}
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
                  {/* Subtle soft blue halo */}
                  <View style={styles.activeGlowHalo} />
                  <View style={styles.activeCircle}>
                    <Ionicons name={meta.focused} size={18} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <View style={styles.inactiveIconContainer}>
                  <Ionicons
                    name={meta.normal}
                    size={20}
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
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 100,
  },
  dockContainer: {
    width: "100%",
    maxWidth: 500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 30,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  dockHighlight: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  activeIconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlowHalo: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(56, 139, 255, 0.22)",
  },
  activeCircle: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: "#388BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#388BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  inactiveIconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
});
