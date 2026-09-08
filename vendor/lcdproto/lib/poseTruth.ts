"use client";

/**
 * Developer-only pose truth recorder.
 *
 * The acting path has several scalar adapters between Mind and canvas pixels.
 * This recorder keeps a bounded, JSON-safe view of each adapter at the named
 * demo beats so a visual mismatch can be located without adding a second
 * animation loop. `recordPoseTruth` is cheap on ordinary frames: it updates
 * the latest value and only deep-copies the full chain when a sample is due.
 */

export const POSE_TRUTH_SAMPLE_TIMES_MS = [
  0,
  600,
  6_900,
  13_100,
  19_300,
  20_000,
  27_600,
  33_500,
  41_000,
  46_900,
  48_000,
  55_600,
] as const;

export const POSE_TRUTH_SCREENSHOT_TIMES_MS = [
  0,
  7_000,
  13_000,
  20_000,
  28_000,
  34_000,
  42_000,
  48_000,
  56_000,
] as const;

export const POSE_TRUTH_VERSION = "studio-v4.5" as const;

export type PoseTruthJson =
  | null
  | boolean
  | number
  | string
  | PoseTruthJson[]
  | { [key: string]: PoseTruthJson };

/** The five controller/physics/render hand-off values recorded per sample. */
export interface PoseTruthRecordInput {
  /** MindTelemetry or an equivalent object containing clockMs/elapsedMs. */
  mind: unknown;
  /** BehaviourController.poseTruthSnapshot() output. */
  primitive: unknown;
  /** BehaviourController.pose() output. */
  pose: unknown;
  /** JellyTarget passed into BlobJellyPhysics.update(). */
  physicsInput: unknown;
  /** JellyPose returned by BlobJellyPhysics.update(). */
  physicsOutput: unknown;
  /** BlobRig handed to the production character renderer. */
  rig: unknown;
  /** Optional relative demo time when the caller owns the demo epoch. */
  elapsedMs?: number | null;
}

export interface PoseTruthFrame {
  version: typeof POSE_TRUTH_VERSION;
  elapsedMs: number;
  recordedAtMs: number;
  mind: PoseTruthJson;
  primitive: PoseTruthJson;
  pose: PoseTruthJson;
  physicsInput: PoseTruthJson;
  physicsOutput: PoseTruthJson;
  rig: PoseTruthJson;
  /** Added by finishPoseTruth when a render sample is due. */
  cloud?: PoseTruthJson;
}

export interface PoseTruthSilhouetteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
  /** Thresholds used so detached low-alpha wisps do not define the bounds. */
  alphaThreshold: number;
  rgbThreshold: number;
}

export interface PoseTruthScreenshot {
  targetMs: number;
  elapsedMs: number;
  dataUrl: string | null;
  bounds: PoseTruthSilhouetteBounds | null;
  error?: string;
}

export interface PoseTruthSnapshot {
  version: typeof POSE_TRUTH_VERSION;
  epochClockMs: number | null;
  elapsedMs: number | null;
  latest: PoseTruthFrame | null;
  samples: readonly PoseTruthFrame[];
  screenshots: readonly PoseTruthScreenshot[];
}

type PoseTruthListener = (snapshot: PoseTruthSnapshot) => void;

interface PendingSample {
  targetMs: number;
  sample: PoseTruthFrame;
}

interface PendingScreenshot {
  targetMs: number;
  elapsedMs: number;
}

const MAX_SAMPLES = POSE_TRUTH_SAMPLE_TIMES_MS.length;
const MAX_SCREENSHOTS = POSE_TRUTH_SCREENSHOT_TIMES_MS.length;
const ALPHA_THRESHOLD = 96;
const RGB_THRESHOLD = 24;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Make finite, bounded JSON data without relying on structuredClone (the
 * recorder also runs in the browser's older development targets). Cycles and
 * unsupported values are represented as strings/null so the UI can always
 * render and download the snapshot.
 */
function toJson(value: unknown, seen = new WeakSet<object>(), depth = 0): PoseTruthJson {
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (typeof value === "undefined") return null;
  if (typeof value === "function" || typeof value === "symbol") return String(value);

  // Protect the panel from accidentally being handed a huge/cyclic object.
  if (depth > 8) return "[depth limit]";
  if (!isObject(value)) return String(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => toJson(item, seen, depth + 1));
  }

  const out: { [key: string]: PoseTruthJson } = {};
  for (const key of Object.keys(value)) {
    try {
      out[key] = toJson(value[key], seen, depth + 1);
    } catch {
      out[key] = "[unreadable]";
    }
  }
  return out;
}

function readNumber(value: unknown, keys: readonly string[]): number | null {
  if (!isObject(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  return null;
}

function readClockMs(mind: unknown): number | null {
  return readNumber(mind, ["clockMs", "elapsedMs", "timeMs", "clock"]);
}

function cloneRecord(input: PoseTruthRecordInput, elapsedMs: number): PoseTruthFrame {
  return {
    version: POSE_TRUTH_VERSION,
    elapsedMs,
    recordedAtMs: Date.now(),
    mind: toJson(input.mind),
    primitive: toJson(input.primitive),
    pose: toJson(input.pose),
    physicsInput: toJson(input.physicsInput),
    physicsOutput: toJson(input.physicsOutput),
    rig: toJson(input.rig),
  };
}

function cloneFrame(frame: PoseTruthFrame): PoseTruthFrame {
  return toJson(frame) as unknown as PoseTruthFrame;
}

function finiteElapsed(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Compute a body silhouette bound from a canvas only when a capture is due. */
function readSilhouetteBounds(canvas: HTMLCanvasElement): PoseTruthSilhouetteBounds | null {
  if (typeof canvas.getContext !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width <= 0 || canvas.height <= 0) return null;
  try {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    let pixelCount = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      const rgb = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      // Detached mist wisps are low-alpha; the second gate avoids transparent
      // antialiasing noise when a browser returns premultiplied black pixels.
      if (alpha < ALPHA_THRESHOLD || rgb < RGB_THRESHOLD) continue;
      const pixel = i / 4;
      const x = pixel % canvas.width;
      const y = Math.floor(pixel / canvas.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      pixelCount += 1;
    }
    if (maxX < minX || maxY < minY) return null;
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixelCount,
      alphaThreshold: ALPHA_THRESHOLD,
      rgbThreshold: RGB_THRESHOLD,
    };
  } catch {
    // Canvas can be unavailable or tainted in a preview. Keep the capture and
    // report the missing bounds in the panel rather than breaking the animation.
    return null;
  }
}

class PoseTruthRecorder {
  private epochClockMs: number | null = null;
  private previousElapsedMs = -Infinity;
  private sampleCursor = 0;
  private screenshotCursor = 0;
  private latest: PoseTruthFrame | null = null;
  private samples: PoseTruthFrame[] = [];
  private screenshots: PoseTruthScreenshot[] = [];
  private pendingSamples: PendingSample[] = [];
  private pendingScreenshots: PendingScreenshot[] = [];
  private listeners = new Set<PoseTruthListener>();
  private finishCount = 0;
  private lastEmitAt = 0;

  begin(startClockMs?: number) {
    this.reset();
    this.epochClockMs = typeof startClockMs === "number" && Number.isFinite(startClockMs)
      ? startClockMs
      : null;
  }

  reset() {
    this.epochClockMs = null;
    this.previousElapsedMs = -Infinity;
    this.sampleCursor = 0;
    this.screenshotCursor = 0;
    this.latest = null;
    this.samples = [];
    this.screenshots = [];
    this.pendingSamples = [];
    this.pendingScreenshots = [];
    this.finishCount = 0;
    this.emit();
  }

  subscribe(listener: PoseTruthListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  record(input: PoseTruthRecordInput): PoseTruthSnapshot {
    const clockMs = readClockMs(input.mind);
    const elapsedMs = finiteElapsed(
      typeof input.elapsedMs === "number"
        ? input.elapsedMs
        : clockMs === null
          ? 0
          : this.epochClockMs === null
            ? clockMs
            : clockMs - this.epochClockMs,
    );

    // A controller reset or a new demo run starts a fresh bounded capture.
    if (elapsedMs + 1 < this.previousElapsedMs) {
      const epoch = clockMs;
      this.reset();
      this.epochClockMs = epoch;
    }

    const lastCloud = this.latest?.cloud;
    this.latest = cloneRecord(input, elapsedMs);
    this.latest.cloud = lastCloud;
    const previous = this.previousElapsedMs;
    this.previousElapsedMs = elapsedMs;

    while (
      this.sampleCursor < POSE_TRUTH_SAMPLE_TIMES_MS.length &&
      elapsedMs >= POSE_TRUTH_SAMPLE_TIMES_MS[this.sampleCursor]
    ) {
        const targetMs = POSE_TRUTH_SAMPLE_TIMES_MS[this.sampleCursor];
      if (previous < targetMs || previous === -Infinity) {
        const sample = cloneFrame(this.latest);
        this.samples.push(sample);
        if (this.samples.length > MAX_SAMPLES) this.samples.shift();
        this.pendingSamples.push({ targetMs, sample });
      }
      this.sampleCursor += 1;
    }
    while (
      this.screenshotCursor < POSE_TRUTH_SCREENSHOT_TIMES_MS.length &&
      elapsedMs >= POSE_TRUTH_SCREENSHOT_TIMES_MS[this.screenshotCursor]
    ) {
      const targetMs = POSE_TRUTH_SCREENSHOT_TIMES_MS[this.screenshotCursor];
      if (previous < targetMs || previous === -Infinity) {
        this.pendingScreenshots.push({ targetMs, elapsedMs });
      }
      this.screenshotCursor += 1;
    }

    this.emit();
    return this.snapshot();
  }

  finish(canvas: HTMLCanvasElement | null | undefined, cloud: unknown): PoseTruthSnapshot {
    this.finishCount += 1;

    // Attach renderer-side values only to due samples. On ordinary frames we
    // avoid copying lobe state or reading pixels entirely.
    if (this.pendingSamples.length > 0) {
      const cloudJson = toJson(cloud);
      for (const pending of this.pendingSamples) pending.sample.cloud = cloudJson;
      this.pendingSamples = [];
    } else if (this.latest && this.finishCount % 10 === 0) {
      // Keep the current panel useful without imposing a per-frame deep copy.
      this.latest.cloud = toJson(cloud);
    }

    if (canvas && this.pendingScreenshots.length > 0) {
      const dataUrl = (() => {
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      })();
      const bounds = readSilhouetteBounds(canvas);
      for (const pending of this.pendingScreenshots) {
        this.screenshots.push({
          targetMs: pending.targetMs,
          elapsedMs: pending.elapsedMs,
          dataUrl,
          bounds,
          ...(dataUrl ? {} : { error: "Canvas pixels unavailable" }),
        });
        if (this.screenshots.length > MAX_SCREENSHOTS) this.screenshots.shift();
      }
      this.pendingScreenshots = [];
    }

    this.emit();
    return this.snapshot();
  }

  snapshot(): PoseTruthSnapshot {
    return {
      version: POSE_TRUTH_VERSION,
      epochClockMs: this.epochClockMs,
      elapsedMs: this.latest?.elapsedMs ?? null,
      latest: this.latest ? cloneFrame(this.latest) : null,
      samples: this.samples.map(cloneFrame),
      screenshots: this.screenshots.map((screenshot) => ({ ...screenshot })),
    };
  }

  private emit() {
    if (this.listeners.size === 0) return;
    const now = Date.now();
    if (now - this.lastEmitAt < 100) return;
    this.lastEmitAt = now;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

const recorder = new PoseTruthRecorder();

/** Begin a bounded pre-lobe-fix capture, optionally anchoring to Mind clockMs. */
export function beginPoseTruth(startClockMs?: number) {
  recorder.begin(startClockMs);
}

/** Clear samples and screenshots while preserving the singleton API. */
export function resetPoseTruth() {
  recorder.reset();
}

/** Record Mind → primitive → pose → physics → rig truth. */
export function recordPoseTruth(input: PoseTruthRecordInput): PoseTruthSnapshot {
  return recorder.record(input);
}

/**
 * Called from the cloud renderer after drawing. The canvas is read only at the
 * nine scheduled screenshot timestamps; `cloud` is attached to due samples.
 */
export function finishPoseTruth(
  canvas: HTMLCanvasElement | null | undefined,
  cloud: unknown,
): PoseTruthSnapshot {
  return recorder.finish(canvas, cloud);
}

export function getPoseTruthSnapshot(): PoseTruthSnapshot {
  return recorder.snapshot();
}

export function subscribePoseTruth(listener: PoseTruthListener) {
  return recorder.subscribe(listener);
}

/** Exposed for focused recorder tests without making the singleton mutable. */
export const poseTruthSilhouetteThresholds = {
  alpha: ALPHA_THRESHOLD,
  rgb: RGB_THRESHOLD,
} as const;
