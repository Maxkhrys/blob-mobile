import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from "react-native-svg";

interface CherriThumbnailProps {
  expressionId: string;
  size?: number;
  selected?: boolean;
}

/**
 * Lightweight SVG representation of Cherri with canonical expression face geometry.
 * Renders instantly with zero WebViews, matching the visual reference thumbnail strip.
 */
export function CherriThumbnail({
  expressionId,
  size = 46,
  selected = false,
}: CherriThumbnailProps) {
  const norm = expressionId.toUpperCase();

  // Determine face geometry based on canonical expression ID
  const isHappy =
    norm.includes("HAPPY") ||
    norm.includes("JOY") ||
    norm.includes("LAUGH") ||
    norm.includes("WINK") ||
    norm.includes("EXCITED");

  const isCurious =
    norm.includes("CURIOUS") ||
    norm.includes("LOOK") ||
    norm.includes("DOUBLE_TAKE") ||
    norm.includes("TILT");

  const isSleepy =
    norm.includes("SLEEPY") ||
    norm.includes("YAWN") ||
    norm.includes("SAD") ||
    norm.includes("SETTLE") ||
    norm.includes("REST");

  const isSurprised =
    norm.includes("SURPRISE") || norm.includes("POP") || norm.includes("SHOCKED");

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 54 54">
        <Defs>
          {/* Volumetric Purple/Lavender Cloud Body Gradient */}
          <LinearGradient id={`cloudBodyGrad_${expressionId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E6E0FA" />
            <Stop offset="35%" stopColor="#CEBEF6" />
            <Stop offset="75%" stopColor="#AA99EB" />
            <Stop offset="100%" stopColor="#8E78DC" />
          </LinearGradient>

          {/* Top Crest Specular Highlight */}
          <LinearGradient id={`crestHighlight_${expressionId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>

          {/* Soft Underside Shadow */}
          <RadialGradient id={`groundShadow_${expressionId}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#1A1230" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#1A1230" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* 1. Ground Contact Shadow */}
        <Path
          d="M 12 46 C 12 43, 42 43, 42 46 C 42 49, 12 49, 12 46 Z"
          fill={`url(#groundShadow_${expressionId})`}
        />

        {/* 2. Canonical Cherri Volumetric Cloud Silhouette */}
        <Path
          d="M 15 39 C 8 39, 6 30, 11 25 C 7 20, 12 13, 19 14 C 21 8, 33 8, 35 14 C 42 13, 47 20, 43 25 C 48 30, 46 39, 39 39 Z"
          fill={`url(#cloudBodyGrad_${expressionId})`}
        />

        {/* 3. Soft Specular Top Crest Light */}
        <Path
          d="M 21 15 C 22 10, 32 10, 33 15 C 29 13, 25 13, 21 15 Z"
          fill={`url(#crestHighlight_${expressionId})`}
        />

        {/* 4. Expression Face Geometry */}
        <G fill="#231938">
          {isHappy && (
            <>
              <Path
                d="M 19 23 Q 22 19 25 23"
                stroke="#231938"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 29 23 Q 32 19 35 23"
                stroke="#231938"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path d="M 24 27 Q 27 32 30 27 Z" fill="#231938" />
            </>
          )}

          {isCurious && (
            <>
              <Circle cx="21" cy="22" r="2.8" />
              <Circle cx="33" cy="21" r="2.3" />
              <Path
                d="M 19 18 Q 22 16 24 17"
                stroke="#231938"
                strokeWidth="1.2"
                fill="none"
              />
              <Path
                d="M 30 18 Q 33 19 35 18"
                stroke="#231938"
                strokeWidth="1.2"
                fill="none"
              />
              <Circle cx="27" cy="28" r="1.6" />
            </>
          )}

          {isSleepy && (
            <>
              <Path
                d="M 19 23 Q 22 25 25 23"
                stroke="#231938"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 29 23 Q 32 25 35 23"
                stroke="#231938"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 24 28 Q 27 26 30 28"
                stroke="#231938"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}

          {isSurprised && (
            <>
              <Circle cx="21" cy="22" r="3.2" fill="#231938" />
              <Circle cx="33" cy="22" r="3.2" fill="#231938" />
              <Circle cx="22" cy="21" r="0.9" fill="#FFFFFF" />
              <Circle cx="34" cy="21" r="0.9" fill="#FFFFFF" />
              <Circle cx="27" cy="29" r="2.2" fill="#231938" />
            </>
          )}

          {!isHappy && !isCurious && !isSleepy && !isSurprised && (
            <>
              <Path
                d="M 20 20 C 20 18.5, 23 18.5, 23 20 L 23 24 C 23 25.5, 20 25.5, 20 24 Z"
                fill="#231938"
              />
              <Path
                d="M 31 20 C 31 18.5, 34 18.5, 34 20 L 34 24 C 34 25.5, 31 25.5, 31 24 Z"
                fill="#231938"
              />
              <Path
                d="M 19 17.5 L 24 17.5"
                stroke="#231938"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <Path
                d="M 30 17.5 L 35 17.5"
                stroke="#231938"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <Path
                d="M 24 27.5 Q 27 29.5 30 27.5"
                stroke="#231938"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
