// Proximity state matching exact LCDPROTO domain language
export type ProximityState =
  | "HOME"
  | "SENSED"
  | "APPROACHING"
  | "VERY_CLOSE"
  | "TOGETHER"
  | "SYNC"
  | "CONNECTED"
  | "RECOGNIZED"
  | "GOODBYE";

export interface ProximityPayload {
  state: ProximityState;
  driverId?: string;
  driverName?: string;
  direction?: "left" | "right" | "ahead" | "behind";
  distanceMeters?: number;
  closingSpeedMps?: number;
  timestamp: number;
}

// Driver types
export type DriverStatus =
  "Offline" | "Online" | "Nearby" | "Approaching" | "Very close" | "Together";

export interface Driver {
  id: string;
  name: string;
  carName: string;
  avatarUri?: string;
  avatarColor: string;
  avatarInitials: string;
  status: DriverStatus;
  lastSeen?: string;
}

// Character types (Cloud is the exclusive character for V0)
export type CloudColourId =
  | "white"
  | "blue"
  | "pink"
  | "lavender"
  | "mint"
  | "peach"
  | "cool-mist"
  | "baby-blue"
  | "purple-void";

export interface CloudColourPreset {
  id: CloudColourId;
  label: string;
  primary: string;
  glow: string;
  border: string;
  accent: string;
  textColor: string;
}

export type EnvironmentId =
  | "scenic"
  | "scenic-b"
  | "bg-a"
  | "bg-b"
  | "zen"
  | "dark"
  | "warm"
  | "sand"
  | "amoled"
  | "sky"
  | "warm-glow";

export interface EnvironmentPreset {
  id: EnvironmentId;
  label: string;
  description: string;
  bgColor: string;
  surfaceColor: string;
  accentColor: string;
  textColor: string;
  badge: string;
}

export type CloudEmotion =
  "idle" | "happy" | "curious" | "sleepy" | "excited" | "surprised";

// Device types
export type DeviceConnectionState =
  "Connected" | "Disconnected" | "Reconnecting";

export type SleepMode = "always-awake" | "sleep-when-parked" | "scheduled-auto";

export interface Device {
  id: string;
  name: string;
  state: DeviceConnectionState;
  battery: number;
  brightness: number; // 0 - 100
  sleepMode: SleepMode;
  firmwareVersion: string;
  lastSynced: string;
}

// Encounters
export type EncounterType = "together" | "passed-nearby" | "recognized";

export interface EncounterRecord {
  id: string;
  driverId: string;
  driverName: string;
  driverCar: string;
  type: EncounterType;
  timestamp: number;
  formattedTime: string;
  durationMinutes?: number;
  narrative: string;
}

// User Profile & Preferences
export type PrivacyMode = "friends-only" | "discoverable" | "invisible";

export interface NotificationPreferences {
  friendNearby: boolean;
  friendApproaching: boolean;
  recognizedFriend: boolean;
}

export interface UserProfile {
  themeMode: "system" | "light" | "dark";
  uiSounds: boolean;
  haptics: boolean;
  avatarUri?: string;
  savedPresets: {
    id: string;
    name: string;
    colourId: CloudColourId;
    environment: EnvironmentId;
  }[];
  username: string;
  carName: string;
  characterName: string;
  characterColour: CloudColourId;
  environment: EnvironmentId;
  privacyMode: PrivacyMode;
  notifications: NotificationPreferences;
  onboardingCompleted: boolean;
  homePlayAreaScale?: number;
}
