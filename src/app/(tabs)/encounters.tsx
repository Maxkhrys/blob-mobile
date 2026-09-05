import React from "react";
import { View } from "react-native";
import { useAppStore } from "../../store/AppContext";
import {
  Screen,
  Heading,
  Copy,
  Surface,
  Avatar,
  layout,
} from "../../components/ui/Kit";
export default function MemoriesScreen() {
  const { encounters, drivers } = useAppStore();
  return (
    <Screen>
      <Heading
        title="Crossed paths"
        subtitle="Small moments. Familiar faces."
      />
      {encounters.length ? (
        encounters.map((e) => (
          <Surface key={e.id}>
            <View style={layout.row}>
              <Avatar
                name={e.driverName}
                uri={drivers.find((d) => d.id === e.driverId)?.avatarUri}
                size={44}
              />
              <View style={{ flex: 1 }}>
                <Copy weight="600">{e.driverName}</Copy>
                <Copy muted size={12}>
                  {e.driverCar}
                </Copy>
              </View>
              <Copy muted size={12}>
                {new Date(e.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Copy>
            </View>
            <Copy size={21} weight="500">
              {e.type === "together"
                ? `Together for ${e.durationMinutes || 1} min`
                : e.type === "recognized"
                  ? `Recognized ${e.driverName}`
                  : `${e.driverName} passed nearby`}
            </Copy>
            <Copy muted size={12}>
              {new Date(e.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Copy>
          </Surface>
        ))
      ) : (
        <View style={{ paddingVertical: 60, gap: 12 }}>
          <Copy size={26}>The first hello is ahead.</Copy>
          <Copy muted>
            Your encounters will collect here. No routes, no GPS history. Just
            the moments you shared.
          </Copy>
        </View>
      )}
    </Screen>
  );
}
