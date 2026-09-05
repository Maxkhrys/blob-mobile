import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildCloudHtml } from './cloudCanvasRuntime';
import {
  CloudColourId,
  CloudEmotion,
  ProximityState,
  CloudColourConfig,
  BehaviourId,
} from '../../domain';
import { getCloudColourPreset } from '../../domain/palettes/presets';
import { getStateColourOverride } from '../../domain/productStates/statePalettes';
import { STATE_EMOTION_MAP } from '../../domain/productStates/stateEmotionMap';

export interface CloudPreviewProps {
  colourId?: CloudColourId;
  palette?: CloudColourConfig;
  emotion?: CloudEmotion | BehaviourId;
  proximityState?: ProximityState;
  driverYaw?: number; // -1 to 1 horizontal glance / turn
  driverPitch?: number; // -1 to 1 vertical glance / pitch
  size?: number;
  showPupils?: boolean;
  interactive?: boolean;
}

export const CloudPreview: React.FC<CloudPreviewProps> = ({
  colourId = 'white',
  palette,
  emotion = 'idle',
  proximityState = 'HOME',
  driverYaw = 0,
  driverPitch = 0,
  size = 240,
  showPupils = false,
  interactive = true,
}) => {
  const webViewRef = useRef<WebView>(null);
  const isFirstRender = useRef(true);

  // 1. Resolve active palette:
  // Direct palette override > Proximity State override > Preset by colourId
  const resolvedPalette = useMemo<CloudColourConfig>(() => {
    if (palette) return palette;
    const stateOverride = getStateColourOverride(proximityState as any);
    if (stateOverride) return stateOverride;
    return getCloudColourPreset(colourId).colour;
  }, [palette, proximityState, colourId]);

  // 2. Resolve active emotion / behaviour:
  const resolvedEmotionId = useMemo<string>(() => {
    switch (emotion) {
      case 'happy':
        return 'HAPPY_EYES';
      case 'curious':
        return 'CURIOUS_TILT_LEFT';
      case 'sleepy':
        return 'SLEEPY_EYES';
      case 'excited':
        return 'EXCITED_EYES';
      case 'surprised':
        return 'SURPRISE_POP';
      case 'idle': {
        const stateConfig = STATE_EMOTION_MAP[proximityState as keyof typeof STATE_EMOTION_MAP];
        if (stateConfig) {
          return stateConfig.expressionId || stateConfig.performanceId || 'REST';
        }
        return 'REST';
      }
      default:
        return emotion;
    }
  }, [emotion, proximityState]);

  // 3. Generate initial HTML payload once on mount
  const [initialHtml] = React.useState(() =>
    buildCloudHtml({
      palette: resolvedPalette,
      state: proximityState,
      emotionId: resolvedEmotionId,
      driverYaw,
      driverPitch,
      showPupils,
      size,
      interactive,
    })
  );

  // 4. Send non-reloading live prop updates via JS bridge
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const payload = JSON.stringify({
      palette: resolvedPalette,
      emotionId: resolvedEmotionId,
      driverYaw,
      driverPitch,
      showPupils,
      interactive,
    });

    const script = `if (window.updateCloudProps) { window.updateCloudProps(${payload}); } true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [
    resolvedPalette,
    resolvedEmotionId,
    driverYaw,
    driverPitch,
    showPupils,
    interactive,
  ]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: initialHtml }}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : 'none'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webViewContainer: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
});
