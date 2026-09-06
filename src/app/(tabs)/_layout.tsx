import React from "react";
import { Tabs } from "expo-router";
import { GlassTabBar } from "../../components/navigation/GlassTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: "Drivers",
          tabBarAccessibilityLabel: "Drivers",
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: "Cherri",
          tabBarAccessibilityLabel: "Cherri",
        }}
      />
      <Tabs.Screen
        name="encounters"
        options={{
          title: "Memories",
          tabBarAccessibilityLabel: "Memories",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarAccessibilityLabel: "Settings",
        }}
      />
    </Tabs>
  );
}
