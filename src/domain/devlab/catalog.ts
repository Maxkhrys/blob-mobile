export interface DevPerformance {
  id: string;
  label: string;
  durationMs: number;
  defaultExpressionId: string;
  description: string;
}

// Synced from LCDPROTO/lib/performances/corePerformances.ts @ bd2460f.
export const CORE_PERFORMANCES: readonly DevPerformance[] = [
  { id: "JOY_HOP", label: "Joy Hop", durationMs: 1100, defaultExpressionId: "HAPPY", description: "Anticipate, hop, land, recover." },
  { id: "LAUGH_SQUISH", label: "Laugh Squish", durationMs: 950, defaultExpressionId: "HAPPY", description: "Three rhythmic laughing squishes with buoyant sway." },
  { id: "EXCITED_WIGGLE", label: "Excited Wiggle", durationMs: 900, defaultExpressionId: "EXCITED", description: "Alternating jelly rotation burst with joy bounce." },
  { id: "CURIOUS_DOUBLE_TAKE", label: "Curious Double Take", durationMs: 1300, defaultExpressionId: "CURIOUS", description: "Look left, snap right, lean in to inspect." },
  { id: "ANGRY_FLARE", label: "Angry Flare", durationMs: 1000, defaultExpressionId: "ANGRY", description: "Tense crouch, rigid flare forward, settle." },
  { id: "SURPRISE_POP", label: "Surprise Pop", durationMs: 850, defaultExpressionId: "SURPRISED", description: "Micro-crouch, vertical pop, floaty recovery." },
  { id: "SLEEPY_YAWN", label: "Sleepy Yawn", durationMs: 1500, defaultExpressionId: "SLEEPY", description: "Slow inhale stretch, yawn, heavy exhale melt." },
  { id: "SAD_SETTLE", label: "Sad Settle", durationMs: 1200, defaultExpressionId: "SAD", description: "Weight shift, sigh, slow sinking sag." },
] as const;

export type DevScreenCategory =
  | "boot"
  | "startup"
  | "power"
  | "connectivity"
  | "problems"
  | "maintenance"
  | "state";

export interface DevScreenDefinition {
  id: string;
  category: DevScreenCategory;
  label: string;
  durationMs: number;
  interruptible: boolean;
  showsBlob: boolean;
  status: "complete" | "placeholder";
}

// Data-only mirror of LCDPROTO/lib/screenCatalogue.ts @ bd2460f.
export const SYSTEM_SCREENS: readonly DevScreenDefinition[] = [
  { id: "BOOT_BLACK", category: "boot", label: "Boot black", durationMs: 420, interruptible: false, showsBlob: false, status: "complete" },
  { id: "DISPLAY_INIT", category: "boot", label: "Display init", durationMs: 900, interruptible: false, showsBlob: false, status: "complete" },
  { id: "LCDPROTO_MARK", category: "boot", label: "LCDPROTO mark", durationMs: 1100, interruptible: true, showsBlob: false, status: "complete" },
  { id: "ASSET_LOADING", category: "startup", label: "Loading", durationMs: 2200, interruptible: false, showsBlob: false, status: "complete" },
  { id: "BLOB_WAKE", category: "startup", label: "Blob wake", durationMs: 1800, interruptible: true, showsBlob: true, status: "complete" },
  { id: "BLOB_READY", category: "startup", label: "Ready", durationMs: 1200, interruptible: true, showsBlob: true, status: "complete" },
  { id: "PAUSE", category: "power", label: "Pause", durationMs: 1600, interruptible: true, showsBlob: true, status: "complete" },
  { id: "DIMMED_PAUSE", category: "power", label: "Dimmed pause", durationMs: 2000, interruptible: true, showsBlob: true, status: "complete" },
  { id: "SLEEP", category: "power", label: "Sleep", durationMs: 1400, interruptible: true, showsBlob: true, status: "complete" },
  { id: "WAKE", category: "power", label: "Wake", durationMs: 1300, interruptible: true, showsBlob: true, status: "complete" },
  { id: "SEARCHING", category: "connectivity", label: "Searching", durationMs: 2400, interruptible: true, showsBlob: false, status: "complete" },
  { id: "PAIRING", category: "connectivity", label: "Pairing", durationMs: 2200, interruptible: true, showsBlob: false, status: "complete" },
  { id: "CONNECTING", category: "connectivity", label: "Connecting", durationMs: 1900, interruptible: true, showsBlob: false, status: "complete" },
  { id: "CONNECTED_CONFIRMATION", category: "connectivity", label: "Connected", durationMs: 1100, interruptible: true, showsBlob: true, status: "complete" },
  { id: "OFFLINE", category: "problems", label: "Offline", durationMs: 2000, interruptible: true, showsBlob: false, status: "complete" },
  { id: "RECONNECTING", category: "problems", label: "Reconnecting", durationMs: 2400, interruptible: true, showsBlob: false, status: "complete" },
  { id: "ERROR", category: "problems", label: "Error", durationMs: 1800, interruptible: true, showsBlob: false, status: "complete" },
  { id: "FIRMWARE_UPDATE", category: "maintenance", label: "Update", durationMs: 3200, interruptible: false, showsBlob: false, status: "complete" },
  { id: "UPDATE_COMPLETE", category: "maintenance", label: "Update complete", durationMs: 1300, interruptible: true, showsBlob: false, status: "complete" },
  { id: "LOW_POWER", category: "maintenance", label: "Low power", durationMs: 2400, interruptible: true, showsBlob: false, status: "complete" },
  { id: "HOME", category: "state", label: "Home", durationMs: 0, interruptible: true, showsBlob: true, status: "complete" },
  { id: "SENSED", category: "state", label: "Sensed", durationMs: 0, interruptible: true, showsBlob: true, status: "complete" },
  { id: "APPROACHING", category: "state", label: "Approaching", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
  { id: "VERY_CLOSE", category: "state", label: "Very close", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
  { id: "TOGETHER", category: "state", label: "Together", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
  { id: "SYNC", category: "state", label: "Sync", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
  { id: "CONNECTED", category: "state", label: "Connected", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
  { id: "RECOGNIZED", category: "state", label: "Recognized", durationMs: 0, interruptible: true, showsBlob: true, status: "placeholder" },
] as const;

export const SCREEN_FLOWS = {
  boot: ["BOOT_BLACK", "DISPLAY_INIT", "ASSET_LOADING", "BLOB_WAKE", "BLOB_READY", "HOME"],
  sleep: ["HOME", "PAUSE", "DIMMED_PAUSE", "SLEEP"],
  wake: ["SLEEP", "WAKE", "BLOB_READY", "HOME"],
  connectivity: ["SEARCHING", "PAIRING", "CONNECTING", "CONNECTED_CONFIRMATION", "HOME"],
  failure: ["CONNECTING", "OFFLINE", "RECONNECTING", "HOME"],
} as const;
