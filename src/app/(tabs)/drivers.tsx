import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../../store/AppContext";
import {
  Screen,
  Heading,
  Copy,
  Avatar,
  Tap,
  Button,
  Field,
  layout,
} from "../../components/ui/Kit";
import { useTheme } from "../../constants/theme";
export default function DriversScreen() {
  const { drivers } = useAppStore();
  const router = useRouter();
  const c = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const shown = drivers.filter(
    (d) =>
      (d.name + " " + d.carName).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        ["Nearby", "Approaching", "Very close", "Together"].includes(d.status)),
  );
  return (
    <Screen>
      <Heading
        title="Your drivers"
        subtitle="Good company, even on ordinary roads."
      />
      <Button
        title="Add a driver"
        onPress={() => router.push("/modal-add-driver")}
      />
      <Field
        label="Find a driver"
        value={query}
        onChangeText={setQuery}
        placeholder="Name or car"
      />
      <View style={layout.row}>
        {["All", "Nearby"].map((f) => (
          <Tap
            key={f}
            label={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 18,
              borderRadius: 14,
              backgroundColor:
                filter === f ? c.backgroundSecondary : "transparent",
            }}
          >
            <Copy weight={filter === f ? "600" : "400"}>{f}</Copy>
          </Tap>
        ))}
      </View>
      {shown.length ? (
        shown.map((d) => (
          <View key={d.id} style={[layout.row, { paddingVertical: 8 }]}>
            <Avatar name={d.name} uri={d.avatarUri} size={56} />
            <View style={{ flex: 1, gap: 3 }}>
              <Copy weight="600" size={18}>
                {d.name}
              </Copy>
              <Copy muted size={13}>
                {d.carName}
              </Copy>
              <Copy
                size={12}
                style={{
                  color: d.status === "Offline" ? c.textSecondary : c.accent,
                }}
              >
                {d.status === "Offline"
                  ? `Last seen ${d.lastSeen || "recently"}`
                  : d.status}
              </Copy>
            </View>
          </View>
        ))
      ) : (
        <View style={{ paddingVertical: 36, gap: 8 }}>
          <Copy size={22}>Room for your people.</Copy>
          <Copy muted>
            {query
              ? "No drivers match that search."
              : filter === "Nearby"
                ? "Nobody nearby right now. Your drivers will appear here as you cross paths."
                : "Add someone you love crossing paths with."}
          </Copy>
        </View>
      )}
      <Copy size={12} muted>
        No precise locations. Just a familiar hello.
      </Copy>
    </Screen>
  );
}
