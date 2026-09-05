import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { View, Platform, AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { WebView, WebViewMessageEvent } from "react-native-webview";
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
import {
  DevLabRuntimeCommand,
  DevLabTelemetry,
  ExpressionRecipe,
  LCDPROTO_SOURCE_SHA,
} from "../../domain/devlab/types";
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
  runtimeActive?: boolean;
  runtimeCommand?: DevLabRuntimeCommand | null;
  commandToken?: number;
  expressionRecipe?: ExpressionRecipe | null;
  debugTelemetry?: boolean;
  onTelemetry?: (telemetry: DevLabTelemetry) => void;
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
  runtimeActive = true,
  runtimeCommand = null,
  commandToken = 0,
  expressionRecipe = null,
  debugTelemetry = false,
  onTelemetry,
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
    active: focused && foreground && runtimeActive,
    reducedMotion,
    reactionId,
    reactionToken,
    expressionRecipe,
    debugTelemetry,
    lcdprotoSourceSha: LCDPROTO_SOURCE_SHA,
  };

  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });

  const [html] = useState(() => buildCloudHtml(config));
  const source = useMemo(() => ({ html }), [html]);

  const sendConfig = useCallback(() => {
    const value = latest.current;
    if (Platform.OS === "web") {
      web.current?.contentWindow?.postMessage(value, "*");
    } else {
      native.current?.injectJavaScript(
        `window.updateCloudProps && window.updateCloudProps(${JSON.stringify(value)});true;`,
      );
    }
  }, []);

  const sendCommand = useCallback((command: DevLabRuntimeCommand) => {
    if (Platform.OS === "web") {
      web.current?.contentWindow?.postMessage(command, "*");
    } else {
      native.current?.injectJavaScript(
        `window.handleDevLabCommand && window.handleDevLabCommand(${JSON.stringify(command)});true;`,
      );
    }
  }, []);

  const signature = JSON.stringify(config);
  useEffect(() => sendConfig(), [signature, sendConfig]);
  useEffect(() => {
    if (runtimeCommand) sendCommand(runtimeCommand);
  }, [runtimeCommand, commandToken, sendCommand]);

  const handleTelemetry = useCallback(
    (data: unknown) => {
      if (!onTelemetry || !data || typeof data !== "object") return;
      const message = data as { type?: string; payload?: DevLabTelemetry };
      if (message.type === "lcdprotoTelemetry" && message.payload) {
        onTelemetry(message.payload);
      }
    },
    [onTelemetry],
  );

  const onNativeMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        handleTelemetry(JSON.parse(event.nativeEvent.data));
      } catch {
        // Runtime only emits JSON telemetry through this channel.
      }
    },
    [handleTelemetry],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (event: MessageEvent) => handleTelemetry(event.data);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [handleTelemetry]);

  const inner = size - 18;
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
            onLoad: sendConfig,
            style: {
              border: 0,
              width: "100%",
              height: "100%",
              display: "block",
              touchAction: "none",
              pointerEvents: interactive ? "auto" : "none",
            },
            sandbox: "allow-scripts allow-same-origin",
          })
        ) : (
          <WebView
            ref={native}
            source={source}
            onLoadEnd={sendConfig}
            onMessage={onNativeMessage}
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
            overScrollMode="never"
            javaScriptEnabled
            androidLayerType="hardware"
            pointerEvents={interactive ? "auto" : "none"}
          />
        )}
      </View>
    </View>
  );
}
