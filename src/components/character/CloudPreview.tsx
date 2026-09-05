import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { View, Platform, AppState, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import { buildCloudHtml, CloudRuntimeConfig } from "./cloudCanvasRuntime";
import {
  CloudColourId,
  CloudEmotion,
  ProximityState,
  CloudColourConfig,
  BehaviourId,
} from "../../domain";
import { getCloudColourPreset } from "../../domain/palettes/presets";
import { getStateColourOverride } from "../../domain/productStates/statePalettes";
import { STATE_EMOTION_MAP } from "../../domain/productStates/stateEmotionMap";
import { getEnvironmentById } from "../../domain/environments/presets";
import { useReducedMotion } from "../ui/Kit";
export interface CloudPreviewProps {
  colourId?: CloudColourId;
  palette?: CloudColourConfig;
  emotion?: CloudEmotion | BehaviourId;
  behaviourId?: string;
  cloudSettings?: any;
  proximityState?: ProximityState;
  driverYaw?: number;
  driverPitch?: number;
  size?: number;
  showPupils?: boolean;
  interactive?: boolean;
  environment?: string;
  reactionId?: string;
  reactionToken?: number;
}
export function CloudPreview({
  colourId = "white",
  palette,
  emotion = "idle",
  proximityState = "HOME",
  driverYaw = 0,
  driverPitch = 0,
  size = 280,
  showPupils = false,
  interactive = true,
  environment = "dark",
  reactionId,
  reactionToken,
  behaviourId,
  cloudSettings,
}: CloudPreviewProps) {
  const native = useRef<WebView>(null);
  const web = useRef<HTMLIFrameElement>(null);
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(true);
  const reducedMotion = useReducedMotion();
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => s.remove();
  }, []);
  const resolved =
    palette ||
    getStateColourOverride(proximityState) ||
    getCloudColourPreset(colourId).colour;
  const aliases: Record<string, string> = {
    idle: "NEUTRAL",
    happy: "HAPPY",
    excited: "EXCITED",
    curious: "CURIOUS",
    sleepy: "SLEEPY",
    surprised: "SURPRISED",
  };
  const emotionId =
    emotion === "idle"
      ? STATE_EMOTION_MAP[proximityState].expressionId
      : aliases[emotion] || emotion;
  const config: CloudRuntimeConfig = {
    palette: resolved,
    state: proximityState,
    emotionId,
    behaviourId,
    cloudSettings,
    driverYaw,
    driverPitch,
    showPupils,
    interactive,
    screenColour: getEnvironmentById(environment).screenColour,
    displayMode: getEnvironmentById(environment).displayMode,
    active: focused && foreground,
    reducedMotion,
    reactionId,
    reactionToken,
  };
  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });
  const [html] = useState(() => buildCloudHtml(config));
  const source = useMemo(() => ({ html }), [html]);
  const postToBridge = useCallback((data: any) => {
    if (Platform.OS === "web")
      web.current?.contentWindow?.postMessage(data, "*");
    else
      native.current?.injectJavaScript(
        `window.handleBridgeMessage && window.handleBridgeMessage({ data: ${JSON.stringify(data)} });true;`,
      );
  }, []);
  const send = useCallback(() => {
    const value = latest.current;
    if (Platform.OS === "web")
      web.current?.contentWindow?.postMessage(value, "*");
    else
      native.current?.injectJavaScript(
        `window.updateCloudProps && window.updateCloudProps(${JSON.stringify(value)});true;`,
      );
  }, []);
  const signature = JSON.stringify(config);
  useEffect(() => send(), [signature, send]);
  const inner = size - 18;

  const dragOrigin = useRef({ x: 0, y: 0 });

  return (
    <View
      accessibilityLabel="Your CHERRIPI display"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#111110",
        padding: 8,
        borderWidth: 1,
        borderColor: "#494542",
        boxShadow: "0px 6px 12px rgba(0,0,0,0.16)",
      }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
          backgroundColor: getEnvironmentById(environment).screenColour,
        }}
      >
        {Platform.OS === "web" ? (
          React.createElement("iframe", {
            ref: web,
            srcDoc: html,
            title: "Live Cherri",
            onLoad: send,
            style: {
              border: 0,
              width: "100%",
              height: "100%",
              display: "block",
            },
            sandbox: "allow-scripts allow-same-origin",
          })
        ) : (
          <WebView
            ref={native}
            source={source}
            onLoadEnd={send}
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={(r) =>
              r.url.startsWith("about:blank") || r.url.startsWith("data:")
            }
            style={{
              backgroundColor: "transparent",
              width: inner,
              height: inner,
            }}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled
            androidLayerType="hardware"
          />
        )}
        {interactive && (
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponder={() => true}
            onMoveShouldSetResponderCapture={() => true}
            onResponderGrant={(e) => {
              dragOrigin.current = {
                x: e.nativeEvent.pageX,
                y: e.nativeEvent.pageY,
              };
              postToBridge({ type: "dragStart", x: 0, y: 0 });
            }}
            onResponderMove={(e) => {
              const dx = e.nativeEvent.pageX - dragOrigin.current.x;
              const dy = e.nativeEvent.pageY - dragOrigin.current.y;
              const currentInner = inner || 200;
              postToBridge({
                type: "dragMove",
                x: (dx / currentInner) * 260,
                y: (dy / currentInner) * 260,
              });
            }}
            onResponderRelease={() => {
              postToBridge({ type: "dragEnd" });
            }}
            onResponderTerminate={() => {
              postToBridge({ type: "dragEnd" });
            }}
          />
        )}
      </View>
    </View>
  );
}
