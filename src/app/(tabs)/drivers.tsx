import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { Screen, Avatar } from "../../components/ui/Kit";
import {
  GlassCard,
  GlassPill,
  GlassSegmentedControl,
  GlassTextField,
  StatusDot,
} from "../../components/ui/Glass";
export default function DriversScreen() {
  const { drivers } = useAppStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Nearby">("All");

  const nearbyDrivers = drivers.filter((d) =>
    ["Nearby", "Approaching", "Very close", "Together"].includes(d.status),
  );

  const shown = drivers.filter(
    (d) =>
      (d.name + " " + d.carName).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        ["Nearby", "Approaching", "Very close", "Together"].includes(d.status)),
  );

  return (
    <Screen variant="calm">
      {/* Top Header & Add Driver Action */}
      <View style={styles.headerRow}>
        <View style={{ gap: 3, flex: 1 }}>
          <Text style={styles.screenTitle}>Your Drivers</Text>
          <Text style={styles.screenSubtitle}>
            Good company, even on ordinary roads.
          </Text>
        </View>

        <GlassPill
          onPress={() => router.push("/modal-add-driver")}
          style={styles.addDriverPill}
        >
          <Ionicons name="person-add" size={14} color="#FFFFFF" />
          <Text style={styles.addDriverText}>Add</Text>
        </GlassPill>
      </View>

      {/* Radar Summary Pill Card if drivers are nearby */}
      {nearbyDrivers.length > 0 && (
        <GlassCard level="subtle" style={styles.radarCard}>
          <View style={styles.radarContent}>
            <View style={styles.radarPulseRing}>
              <StatusDot color="#388BFF" size={8} pulse />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.radarTitle}>
                {nearbyDrivers.length} {nearbyDrivers.length === 1 ? "friend nearby now" : "friends nearby now"}
              </Text>
              <Text style={styles.radarSubtitle}>
                Local presence detected. No exact GPS tracking is stored.
              </Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Search Field */}
      <GlassTextField
        placeholder="Find a driver or car…"
        value={query}
        onChangeText={setQuery}
      />

      {/* Segmented Filter */}
      <GlassSegmentedControl
        selected={filter}
        onSelect={(f) => setFilter(f)}
        items={[
          { id: "All", label: `All (${drivers.length})` },
          { id: "Nearby", label: `Nearby (${nearbyDrivers.length})` },
        ]}
      />

      {/* Driver Cards */}
      <View style={{ gap: 12 }}>
        {shown.length ? (
          shown.map((d) => {
            const isNearby = ["Nearby", "Approaching", "Very close", "Together"].includes(d.status);
            return (
              <GlassCard key={d.id} style={styles.driverCard}>
                <View style={styles.driverCardContent}>
                  <View style={styles.avatarWrapper}>
                    <Avatar name={d.name} uri={d.avatarUri} size={50} />
                    <View style={styles.avatarStatusBadge}>
                      <StatusDot
                        color={isNearby ? "#388BFF" : "rgba(255, 255, 255, 0.4)"}
                        size={6}
                        pulse={isNearby}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.driverName}>{d.name}</Text>
                    <Text style={styles.driverCar}>{d.carName}</Text>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isNearby
                            ? "rgba(56, 139, 255, 0.18)"
                            : "rgba(255, 255, 255, 0.06)",
                          borderColor: isNearby
                            ? "rgba(56, 139, 255, 0.45)"
                            : "rgba(255, 255, 255, 0.12)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isNearby ? "#388BFF" : "rgba(240, 244, 252, 0.55)",
                          },
                        ]}
                      >
                        {d.status}
                      </Text>
                    </View>
                    {d.status === "Offline" && d.lastSeen && (
                      <Text style={styles.lastSeenText}>{d.lastSeen}</Text>
                    )}
                  </View>
                </View>
              </GlassCard>
            );
          })
        ) : (
          <GlassCard style={{ paddingVertical: 40, alignItems: "center", gap: 8 }}>
            <Ionicons name="people-outline" size={36} color="rgba(240, 244, 252, 0.4)" />
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>
              Room for your people.
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(240, 244, 252, 0.55)", textAlign: "center", maxWidth: 260 }}>
              {query ? "No drivers match your search query." : "Add friends or demo drivers to experience proximity reactions."}
            </Text>
          </GlassCard>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
  },
  addDriverPill: {
    backgroundColor: "rgba(56, 139, 255, 0.28)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addDriverText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  radarCard: {
    padding: 14,
    borderColor: "rgba(56, 139, 255, 0.25)",
  },
  radarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radarPulseRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56, 139, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  radarSubtitle: {
    fontSize: 11,
    color: "rgba(240, 244, 252, 0.55)",
    lineHeight: 15,
  },
  driverCard: {
    padding: 14,
  },
  driverCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarStatusBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: "#0B0E17",
    borderRadius: 6,
    padding: 2,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  driverCar: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  lastSeenText: {
    fontSize: 10,
    color: "rgba(240, 244, 252, 0.40)",
  },
});
