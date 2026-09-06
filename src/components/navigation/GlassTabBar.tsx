import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  useReducedMotion,
  cancelAnimation,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface DockBorderBeamProps {
  width: number;
  height: number;
  reducedMotion: boolean;
}

function DockBorderBeam({ width, height, reducedMotion }: DockBorderBeamProps) {
  const beamOffset = useSharedValue(0);

  const cornerRadius = 30;
  const straightW = Math.max(0, width - 2 * cornerRadius);
  const straightH = Math.max(0, height - 2 * cornerRadius);
  const perimeter = 2 * straightW + 2 * straightH + 2 * Math.PI * cornerRadius;

  useEffect(() => {
    if (reducedMotion || perimeter <= 0) {
      beamOffset.value = 0;
      return;
    }

    beamOffset.value = 0;
    beamOffset.value = withRepeat(
      withTiming(-perimeter, {
        duration: 7000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(beamOffset);
    };
  }, [perimeter, reducedMotion, beamOffset]);

  const haloProps = useAnimatedProps(() => ({
    strokeDashoffset: beamOffset.value,
  }));

  const coreProps = useAnimatedProps(() => ({
    strokeDashoffset: beamOffset.value,
  }));

  if (reducedMotion || width <= 0 || height <= 0) {
    return null;
  }

  const haloLength = Math.min(110, perimeter * 0.22);
  const coreLength = Math.min(55, perimeter * 0.11);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Outer ambient specular glow */}
      <AnimatedRect
        x={0.75}
        y={0.75}
        width={Math.max(0, width - 1.5)}
        height={Math.max(0, height - 1.5)}
        rx={cornerRadius - 0.75}
        ry={cornerRadius - 0.75}
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={2.4}
        strokeDasharray={[haloLength, Math.max(1, perimeter - haloLength)]}
        strokeLinecap="round"
        animatedProps={haloProps}
      />
      {/* Inner crisp specular core */}
      <AnimatedRect
        x={0.75}
        y={0.75}
        width={Math.max(0, width - 1.5)}
        height={Math.max(0, height - 1.5)}
        rx={cornerRadius - 0.75}
        ry={cornerRadius - 0.75}
        fill="none"
        stroke="rgba(255, 255, 255, 0.38)"
        strokeWidth={1.2}
        strokeDasharray={[coreLength, Math.max(1, perimeter - coreLength)]}
        strokeLinecap="round"
        animatedProps={coreProps}
      />
    </Svg>
  );
}

interface GlassTabButtonProps {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  meta: {
    focused: keyof typeof Ionicons.glyphMap;
    normal: keyof typeof Ionicons.glyphMap;
    label: string;
  };
  accessibilityLabel: string;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  scale: SharedValue<number>;
}

function GlassTabButton({
  isFocused,
  meta,
  accessibilityLabel,
  onPress,
  onLayout,
  scale,
}: GlassTabButtonProps) {
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLayout={onLayout}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Ionicons
          name={isFocused ? meta.focused : meta.normal}
          size={isFocused ? 19 : 20}
          color={isFocused ? "#FFFFFF" : "rgba(240, 244, 252, 0.65)"}
        />
      </Animated.View>
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
}

export function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const reducedMotion = useReducedMotion();

  const [dockDimensions, setDockDimensions] = useState({ width: 360, height: 56 });
  const tabCentersRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const onDockLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDockDimensions({ width, height });
    }
  }, []);

  const getFallbackCenter = useCallback(
    (idx: number) => {
      const usableWidth = Math.max(0, dockDimensions.width - 12);
      const slotWidth = usableWidth / Math.max(1, state.routes.length);
      return 6 + (idx + 0.5) * slotWidth;
    },
    [dockDimensions.width, state.routes.length]
  );

  const getTabCenter = useCallback(
    (idx: number): number => {
      const measured = tabCentersRef.current[idx];
      if (measured && measured > 0) {
        return measured;
      }
      return getFallbackCenter(idx);
    },
    [getFallbackCenter]
  );

  const initialCenter = getFallbackCenter(state.index);

  // Reanimated shared values for gooey liquid active indicator
  const leadX = useSharedValue(initialCenter);
  const trailX = useSharedValue(initialCenter);
  const pinchX = useSharedValue(initialCenter);
  const pinchOpacity = useSharedValue(0);
  const pinchScale = useSharedValue(1);
  const settleSquash = useSharedValue(1);
  const orbPulse = useSharedValue(1);

  // Per-tab scale shared values for crisp press microinteractions
  const iconScale0 = useSharedValue(1);
  const iconScale1 = useSharedValue(1);
  const iconScale2 = useSharedValue(1);
  const iconScale3 = useSharedValue(1);
  const iconScale4 = useSharedValue(1);
  const iconScales = useMemo(
    () => [iconScale0, iconScale1, iconScale2, iconScale3, iconScale4],
    [iconScale0, iconScale1, iconScale2, iconScale3, iconScale4]
  );

  const isInitialMount = useRef(true);
  const prevIndexRef = useRef(state.index);

  useEffect(() => {
    const targetX = getTabCenter(state.index);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      leadX.value = targetX;
      trailX.value = targetX;
      pinchX.value = targetX;
      return;
    }

    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = state.index;

    if (prevIdx === state.index) {
      return;
    }

    // Current visual center of the liquid indicator
    const currentCenter = (leadX.value + trailX.value) / 2;
    const distance = Math.abs(targetX - currentCenter);

    if (reducedMotion) {
      leadX.value = targetX;
      trailX.value = targetX;
      pinchOpacity.value = 0;
      return;
    }

    // Duration scales with distance: ~260ms (adjacent) to ~360ms (far jump)
    const duration = Math.min(360, Math.max(260, 240 + (distance / 240) * 120));

    // 1. Departure pinch-off droplet at previous position
    pinchX.value = currentCenter;
    pinchOpacity.value = 0.75;
    pinchScale.value = 1.0;
    pinchOpacity.value = withTiming(0, {
      duration: duration * 0.42,
      easing: Easing.out(Easing.quad),
    });
    pinchScale.value = withTiming(0.2, {
      duration: duration * 0.42,
      easing: Easing.out(Easing.quad),
    });

    // 2. Leading edge surges forward toward destination
    leadX.value = withTiming(targetX, {
      duration: duration * 0.88,
      easing: Easing.bezier(0.18, 0.85, 0.35, 1.0),
    });

    // 3. Trailing edge follows with viscous fluid delay
    trailX.value = withTiming(targetX, {
      duration: duration,
      easing: Easing.bezier(0.38, 0.05, 0.22, 1.0),
    });

    // 4. Arrival squash & spring settle
    settleSquash.value = 1;
    settleSquash.value = withSequence(
      withDelay(
        duration * 0.72,
        withTiming(1.14, { duration: duration * 0.12, easing: Easing.out(Easing.quad) })
      ),
      withSpring(1.0, { damping: 13, stiffness: 240 })
    );
  }, [state.index, reducedMotion, getTabCenter, leadX, trailX, pinchX, pinchOpacity, pinchScale, settleSquash]);

  const onTabLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    if (width > 0) {
      tabCentersRef.current[index] = x + width / 2;
    }
  }, []);

  // Animated style for shared liquid active core
  const animatedBlobStyle = useAnimatedStyle(() => {
    const x1 = leadX.value;
    const x2 = trailX.value;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);

    const rawStretch = maxX - minX;
    const stretch = Math.min(rawStretch, 56);

    const width = 33 + stretch;
    const baseHeight = 33 - (stretch / 56) * 5.5;
    const height = baseHeight * settleSquash.value;
    const center = (x1 + x2) / 2;

    return {
      transform: [
        { translateX: center - width / 2 },
        { translateY: 26 - height / 2 },
        { scale: orbPulse.value },
      ],
      width,
      height,
      borderRadius: height / 2,
    };
  });

  // Animated style for ambient blue glow halo
  const animatedHaloStyle = useAnimatedStyle(() => {
    const x1 = leadX.value;
    const x2 = trailX.value;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const stretch = Math.min(maxX - minX, 56);

    const width = 40 + stretch;
    const baseHeight = 40 - (stretch / 56) * 6;
    const height = baseHeight * settleSquash.value;
    const center = (x1 + x2) / 2;

    return {
      transform: [
        { translateX: center - width / 2 },
        { translateY: 26 - height / 2 },
        { scale: orbPulse.value },
      ],
      width,
      height,
      borderRadius: height / 2,
    };
  });

  // Animated style for departure pinch-off droplet
  const animatedPinchStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: pinchX.value - 12 },
        { translateY: 26 - 12 },
        { scale: pinchScale.value },
      ],
      opacity: pinchOpacity.value,
    };
  });

  // Floating dock sits nicely above bottom safe area
  const bottomMargin = Math.max(insets.bottom, 10);

  return (
    <View pointerEvents="box-none" style={[styles.outerWrapper, { bottom: bottomMargin }]}>
      <View
        onLayout={onDockLayout}
        style={[
          styles.dockContainer,
          {
            backgroundColor: "rgba(24, 34, 56, 0.40)",
            borderColor: "rgba(255, 255, 255, 0.28)",
            shadowColor: "#000000",
          },
        ]}
      >
        {/* Top subtle inner specular highlight */}
        <View
          pointerEvents="none"
          style={[styles.dockHighlight, { borderColor: "rgba(255, 255, 255, 0.42)" }]}
        />

        {/* Faint moving white specular beam around outer dock perimeter */}
        <DockBorderBeam
          width={dockDimensions.width}
          height={dockDimensions.height}
          reducedMotion={!!reducedMotion}
        />

        {/* Shared Liquid Active Tab Indicator (Underneath icons) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.sharedHalo, animatedHaloStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.sharedPinchDroplet, animatedPinchStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.sharedBlob, animatedBlobStyle]}
        >
          {/* Subtle glossy liquid glass sheen on top half of orb */}
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.36)", "rgba(255, 255, 255, 0.0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.liquidGloss}
          />
        </Animated.View>

        {/* Crisp Tab Buttons Layer (Icons and text stay 100% stable & sharp) */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const meta = TAB_ICONS[route.name] || {
            focused: "cube",
            normal: "cube-outline",
            label: options.title || route.name,
          };

          const onPress = () => {
            feedback("tick");

            // Press microinteraction on icon and active orb
            if (!reducedMotion) {
              if (iconScales[index]) {
                iconScales[index].value = withSequence(
                  withTiming(0.94, { duration: 70 }),
                  withSpring(1.0, { damping: 14, stiffness: 280 })
                );
              }
              orbPulse.value = withSequence(
                withTiming(1.06, { duration: 70 }),
                withSpring(1.0, { damping: 14, stiffness: 220 })
              );
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <GlassTabButton
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              isFocused={isFocused}
              meta={meta}
              accessibilityLabel={options.tabBarAccessibilityLabel || meta.label}
              onPress={onPress}
              onLayout={(e) => onTabLayout(index, e)}
              scale={iconScales[index] || iconScale0}
            />
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
  sharedHalo: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(56, 139, 255, 0.22)",
    shadowColor: "#388BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  sharedPinchDroplet: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#388BFF",
  },
  sharedBlob: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#388BFF",
    overflow: "hidden",
    shadowColor: "#388BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 5,
  },
  liquidGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
    zIndex: 2,
  },
  iconContainer: {
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

