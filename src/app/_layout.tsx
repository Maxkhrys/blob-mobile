import { useTheme } from "../constants/theme";
import { FeedbackProvider } from "../services/feedback/FeedbackProvider";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppContextProvider, useAppStore } from "../store/AppContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

function RootNavigation() {
  const { isReady, profile } = useAppStore();
  const c = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === "onboarding";

    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile.onboardingCompleted && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isReady, profile.onboardingCompleted, segments, router]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={c.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="dev-lab"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="simulator"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Proximity Simulator",
            headerBackTitle: "Close",
            headerTintColor: c.text,
            headerTitleStyle: { fontWeight: "700" },
          }}
        />
        <Stack.Screen
          name="modal-add-driver"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Driver",
            headerBackTitle: "Cancel",
            headerTintColor: c.text,
            headerTitleStyle: { fontWeight: "700" },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppContextProvider>
        <FeedbackProvider>
          <RootNavigation />
        </FeedbackProvider>
      </AppContextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
  },
});
