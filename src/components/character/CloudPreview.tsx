import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { CloudColourId, CloudEmotion, ProximityState } from '../../types';
import { getCloudColourPreset } from '../../constants/palettes';

interface CloudPreviewProps {
  colourId?: CloudColourId;
  emotion?: CloudEmotion;
  proximityState?: ProximityState;
  size?: number;
}

export const CloudPreview: React.FC<CloudPreviewProps> = ({
  colourId = 'blue',
  emotion = 'idle',
  proximityState = 'HOME',
  size = 220,
}) => {
  const preset = getCloudColourPreset(colourId);

  // Animated values initialized via useState to adhere to React 19 purity rules
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [breathAnim] = useState(() => new Animated.Value(1));
  const [tiltAnim] = useState(() => new Animated.Value(0));
  const [reactionScale] = useState(() => new Animated.Value(1));

  // Memoized interpolations
  const scaleAnim = useMemo(
    () => Animated.multiply(breathAnim, reactionScale),
    [breathAnim, reactionScale]
  );

  const rotateAnim = useMemo(
    () =>
      tiltAnim.interpolate({
        inputRange: [-0.1, 0.1],
        outputRange: ['-6deg', '6deg'],
      }),
    [tiltAnim]
  );

  const shadowScaleX = useMemo(
    () =>
      breathAnim.interpolate({
        inputRange: [0.97, 1.03],
        outputRange: [1.05, 0.95],
      }),
    [breathAnim]
  );

  const shadowOpacity = useMemo(
    () =>
      floatAnim.interpolate({
        inputRange: [-8, 6],
        outputRange: [0.35, 0.55],
      }),
    [floatAnim]
  );

  // Idle float and breath loop
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.03,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0.97,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    breathLoop.start();

    return () => {
      floatLoop.stop();
      breathLoop.stop();
    };
  }, [floatAnim, breathAnim]);

  // React to emotion or proximity change
  useEffect(() => {
    if (emotion === 'happy' || proximityState === 'TOGETHER') {
      Animated.sequence([
        Animated.spring(reactionScale, {
          toValue: 1.09,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(reactionScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (emotion === 'curious' || proximityState === 'SENSED') {
      Animated.sequence([
        Animated.timing(tiltAnim, {
          toValue: -0.06,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: 0,
          duration: 600,
          delay: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (emotion === 'excited' || proximityState === 'APPROACHING') {
      Animated.sequence([
        Animated.spring(reactionScale, {
          toValue: 1.12,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(reactionScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (emotion === 'surprised' || proximityState === 'VERY_CLOSE') {
      Animated.sequence([
        Animated.timing(reactionScale, {
          toValue: 1.14,
          duration: 150,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.spring(reactionScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [emotion, proximityState, reactionScale, tiltAnim]);

  // Determine face styling based on emotion and proximity state
  const isSleepy = emotion === 'sleepy';
  const isHappy = emotion === 'happy' || proximityState === 'TOGETHER';
  const isSurprised =
    emotion === 'surprised' || proximityState === 'VERY_CLOSE';
  const isCurious = emotion === 'curious' || proximityState === 'SENSED';
  const isExcited =
    emotion === 'excited' || proximityState === 'APPROACHING';

  const eyeGlanceX = isCurious ? 3 : isExcited ? 1 : 0;
  const eyeGlanceY = isCurious ? -2 : isExcited ? -1 : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Contact Shadow on Floor / Pedestal */}
      <Animated.View
        style={[
          styles.shadowContainer,
          {
            width: size * 0.65,
            height: size * 0.12,
            transform: [{ scaleX: shadowScaleX }],
            opacity: shadowOpacity,
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 20">
          <Defs>
            <RadialGradient
              id="shadowGrad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#0F172A" stopOpacity="0.25" />
              <Stop offset="60%" stopColor="#0F172A" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="10" rx="46" ry="8" fill="url(#shadowGrad)" />
        </Svg>
      </Animated.View>

      {/* Floating Cloud Body with Face */}
      <Animated.View
        style={[
          styles.cloudWrapper,
          {
            transform: [
              { translateY: floatAnim },
              { scale: scaleAnim },
              { rotate: rotateAnim },
            ],
          },
        ]}
      >
        <Svg width={size} height={size * 0.82} viewBox="0 0 300 240">
          <Defs>
            {/* Primary Cloud Gradient */}
            <LinearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="55%" stopColor={preset.primary} stopOpacity="0.95" />
              <Stop offset="100%" stopColor={preset.border} stopOpacity="0.8" />
            </LinearGradient>

            {/* Inner Core Warm Glow */}
            <RadialGradient
              id="coreGlow"
              cx="50%"
              cy="45%"
              rx="45%"
              ry="40%"
              fx="50%"
              fy="40%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="50%" stopColor={preset.primary} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={preset.primary} stopOpacity="0" />
            </RadialGradient>

            {/* Cheek Blush Gradient */}
            <RadialGradient
              id="blushGrad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
            >
              <Stop offset="0%" stopColor="#F472B6" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Cloud Cumulus Lobes (Back and Core) */}
          {/* Base Left Lobe */}
          <Circle cx="85" cy="148" r="54" fill="url(#cloudGrad)" />
          {/* Base Right Lobe */}
          <Circle cx="215" cy="148" r="54" fill="url(#cloudGrad)" />
          {/* Bottom Belly Lobe */}
          <Circle cx="150" cy="162" r="52" fill="url(#cloudGrad)" />
          {/* Mid Left Cheek Lobe */}
          <Circle cx="98" cy="118" r="52" fill="url(#cloudGrad)" />
          {/* Mid Right Cheek Lobe */}
          <Circle cx="202" cy="118" r="52" fill="url(#cloudGrad)" />
          {/* Center Main Core Lobe */}
          <Circle cx="150" cy="120" r="62" fill="url(#cloudGrad)" />
          {/* Top Crown Lobe */}
          <Circle cx="150" cy="82" r="54" fill="url(#cloudGrad)" />
          {/* Top Left Puff */}
          <Circle cx="112" cy="88" r="44" fill="url(#cloudGrad)" />
          {/* Top Right Puff */}
          <Circle cx="188" cy="88" r="44" fill="url(#cloudGrad)" />

          {/* Soft Core Overlay Glow */}
          <Circle cx="150" cy="122" r="54" fill="url(#coreGlow)" />

          {/* Cheek Blush */}
          <Ellipse cx="108" cy="140" rx="14" ry="7" fill="url(#blushGrad)" />
          <Ellipse cx="192" cy="140" rx="14" ry="7" fill="url(#blushGrad)" />

          {/* Facial Features (Eyes and Mouth) */}
          {/* Left Eye */}
          {isSleepy ? (
            // Cute closed sleepy crescent eye
            <Path
              d="M 116 122 Q 124 128 132 122"
              stroke="#1E293B"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <G>
              <Ellipse
                cx={124 + eyeGlanceX}
                cy={120 + eyeGlanceY}
                rx={isSurprised || isExcited ? 7.5 : 6.2}
                ry={isSurprised || isExcited ? 8.5 : 7.2}
                fill="#1E293B"
              />
              <Circle
                cx={126 + eyeGlanceX}
                cy={117 + eyeGlanceY}
                r="2.2"
                fill="#FFFFFF"
              />
              <Circle
                cx={122 + eyeGlanceX}
                cy={122 + eyeGlanceY}
                r="1.1"
                fill="#FFFFFF"
              />
            </G>
          )}

          {/* Right Eye */}
          {isSleepy ? (
            // Cute closed sleepy crescent eye
            <Path
              d="M 168 122 Q 176 128 184 122"
              stroke="#1E293B"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <G>
              <Ellipse
                cx={176 + eyeGlanceX}
                cy={120 + eyeGlanceY}
                rx={isSurprised || isExcited ? 7.5 : 6.2}
                ry={isSurprised || isExcited ? 8.5 : 7.2}
                fill="#1E293B"
              />
              <Circle
                cx={178 + eyeGlanceX}
                cy={117 + eyeGlanceY}
                r="2.2"
                fill="#FFFFFF"
              />
              <Circle
                cx={174 + eyeGlanceX}
                cy={122 + eyeGlanceY}
                r="1.1"
                fill="#FFFFFF"
              />
            </G>
          )}

          {/* Mouth */}
          {isSurprised || isExcited ? (
            // Cute rounded 'o' mouth
            <Ellipse
              cx="150"
              cy="138"
              rx="4.2"
              ry="5.8"
              fill="#1E293B"
            />
          ) : isHappy ? (
            // Wide cheerful smile
            <Path
              d="M 141 134 Q 150 145 159 134"
              stroke="#1E293B"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // Restrained, friendly neutral mouth
            <Path
              d="M 143 135 Q 150 141 157 135"
              stroke="#1E293B"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shadowContainer: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
