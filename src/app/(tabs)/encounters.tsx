import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store/AppContext";
import { Screen, Avatar } from "../../components/ui/Kit";
import { GlassCard, StatusDot } from "../../components/ui/Glass";

export default function MemoriesScreen() {
  const { encounters, drivers } = useAppStore();

  return (
    <Screen variant="calm">
      {/* Header */}
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text style={styles.screenTitle}>Crossed Paths</Text>
        <Text style={styles.screenSubtitle}>
          Small moments. Familiar faces along the journey.
        </Text>
      </View>

      {/* Encounters Timeline */}
      {encounters.length ? (
        <View style={styles.timelineContainer}>
          {/* Subtle vertical timeline line */}
          <View pointerEvents="none" style={styles.timelineLine} />

          {encounters.map((e, index) => {
            const driver = drivers.find((d) => d.id === e.driverId);
            const dateStr = new Date(e.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const timeStr = new Date(e.timestamp).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <View key={e.id} style={styles.timelineItem}>
                {/* Timeline node */}
                <View style={styles.timelineNode}>
                  <StatusDot color="#388BFF" size={8} pulse={index === 0} />
                </View>

                {/* Glass Encounter Card */}
                <GlassCard style={styles.encounterCard}>
                  {/* Top: Avatar, Driver Name, Date */}
                  <View style={styles.encounterTop}>
                    <Avatar
                      name={e.driverName}
                      uri={driver?.avatarUri}
                      size={44}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.driverName}>{e.driverName}</Text>
                      <Text style={styles.driverCar}>{e.driverCar}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                  </View>

                  {/* Highlighted Encounter Headline */}
                  <Text style={styles.encounterHeadline}>
                    {e.type === "together"
                      ? `Together for ${e.durationMinutes || 1} min`
                      : e.type === "recognized"
                        ? `Recognized ${e.driverName}`
                        : `${e.driverName} passed nearby`}
                  </Text>

                  {/* Timestamp & Icon */}
                  <View style={styles.encounterBottom}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color="rgba(240, 244, 252, 0.45)"
                    />
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>
                </GlassCard>
              </View>
            );
          })}
        </View>
      ) : (
        /* Intentional, comforting empty state */
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="sparkles-outline" size={32} color="#388BFF" />
          </View>
          <Text style={styles.emptyTitle}>The first hello is ahead.</Text>
          <Text style={styles.emptyDesc}>
            Your crossed paths and shared journeys will collect here. No routes or continuous tracking—just real moments with good company.
          </Text>
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  timelineContainer: {
    position: "relative",
    gap: 16,
    paddingLeft: 22,
  },
  timelineLine: {
    position: "absolute",
    left: 7,
    top: 18,
    bottom: 24,
    width: 2,
    backgroundColor: "rgba(56, 139, 255, 0.22)",
  },
  timelineItem: {
    position: "relative",
  },
  timelineNode: {
    position: "absolute",
    left: -22,
    top: 22,
    zIndex: 2,
  },
  encounterCard: {
    padding: 16,
    gap: 10,
  },
  encounterTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  driverCar: {
    fontSize: 12,
    color: "rgba(240, 244, 252, 0.55)",
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(240, 244, 252, 0.70)",
  },
  encounterHeadline: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  encounterBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 11,
    color: "rgba(240, 244, 252, 0.45)",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 14,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(56, 139, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 139, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: "rgba(240, 244, 252, 0.60)",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 290,
  },
});
