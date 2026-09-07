import type { BlobDestination } from "../blobMind";
import type { MindEventId, Rarity, StoryCategory } from "./types";

class RingBuffer<T> {
  private readonly items: (T | undefined)[];
  private cursor = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    this.items = new Array<T | undefined>(capacity);
  }

  push(value: T) {
    this.items[this.cursor] = value;
    this.cursor = (this.cursor + 1) % this.capacity;
    if (this.filled < this.capacity) this.filled += 1;
  }

  clear() {
    this.cursor = 0;
    this.filled = 0;
    this.items.fill(undefined);
  }

  get size() {
    return this.filled;
  }

  /** Newest first. Allocates one array — callers use it off the hot path. */
  toArray(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.filled; i += 1) {
      const index = (this.cursor - 1 - i + this.capacity * 2) % this.capacity;
      const value = this.items[index];
      if (value !== undefined) out.push(value);
    }
    return out;
  }

  /** How many entries back the newest match sits, or -1. No allocation. */
  indexOfRecent(match: (value: T) => boolean): number {
    for (let i = 0; i < this.filled; i += 1) {
      const index = (this.cursor - 1 - i + this.capacity * 2) % this.capacity;
      const value = this.items[index];
      if (value !== undefined && match(value)) return i;
    }
    return -1;
  }
}

export interface StoryMemoryEntry {
  id: string;
  category: StoryCategory;
  atMs: number;
  destination: string;
}

export interface EventMemoryEntry {
  id: MindEventId;
  atMs: number;
  strength: number;
}

const STORY_CAPACITY = 20;
const EVENT_CAPACITY = 16;

export class MindMemory {
  private readonly stories = new RingBuffer<StoryMemoryEntry>(STORY_CAPACITY);
  private readonly events = new RingBuffer<EventMemoryEntry>(EVENT_CAPACITY);
  private readonly zones = new RingBuffer<BlobDestination>(8);
  /** id → clock time the cooldown expires. Bounded by the catalogue size. */
  private readonly cooldowns = new Map<string, number>();
  private readonly categoryLastAt = new Map<StoryCategory, number>();
  private readonly tierLastAt = new Map<Rarity, number>();
  lastInteractionAt = 0;
  lastWallImpactAt = -1e9;
  lastGrabAt = -1e9;
  wallImpactStreak = 0;
  grabStreak = 0;
  currentZone: BlobDestination = "CENTER";
  targetZone: BlobDestination = "CENTER";
  previousZone: BlobDestination = "CENTER";
  zoneEnteredAt = 0;
  /** Clock time of the last real zone change, for movement telemetry. */
  lastWorldMoveAt = 0;

  reset() {
    this.stories.clear();
    this.events.clear();
    this.zones.clear();
    this.zones.push("CENTER");
    this.cooldowns.clear();
    this.categoryLastAt.clear();
    this.tierLastAt.clear();
    this.lastInteractionAt = 0;
    this.lastWallImpactAt = -1e9;
    this.lastGrabAt = -1e9;
    this.wallImpactStreak = 0;
    this.grabStreak = 0;
    this.currentZone = "CENTER";
    this.targetZone = "CENTER";
    this.previousZone = "CENTER";
    this.zoneEnteredAt = 0;
    this.lastWorldMoveAt = 0;
  }

  setTargetZone(zone: BlobDestination) {
    this.targetZone = zone;
  }

  setZone(zone: BlobDestination, nowMs: number) {
    if (zone !== this.currentZone) {
      this.previousZone = this.currentZone;
      this.currentZone = zone;
      this.targetZone = zone;
      this.zoneEnteredAt = nowMs;
      this.lastWorldMoveAt = nowMs;
      this.zones.push(zone);
    }
  }

  msSinceWorldMove(nowMs: number): number {
    return Math.max(0, nowMs - this.lastWorldMoveAt);
  }

  timeInZone(nowMs: number): number {
    return Math.max(0, nowMs - this.zoneEnteredAt);
  }

  zoneRecency(zone: BlobDestination): number {
    return this.zones.indexOfRecent((z) => z === zone);
  }

  recentZones(): BlobDestination[] {
    const list = this.zones.toArray();
    return list.length === 0 ? ["CENTER"] : list;
  }

  rememberStory(entry: StoryMemoryEntry, cooldownUntil: number, rarity: Rarity) {
    this.stories.push(entry);
    this.cooldowns.set(entry.id, cooldownUntil);
    this.categoryLastAt.set(entry.category, entry.atMs);
    this.tierLastAt.set(rarity, entry.atMs);
  }

  /** How long since any story of this tier played. */
  msSinceTier(rarity: Rarity, nowMs: number): number {
    const at = this.tierLastAt.get(rarity);
    return at === undefined ? Number.POSITIVE_INFINITY : nowMs - at;
  }

  rememberEvent(entry: EventMemoryEntry) {
    this.events.push(entry);
  }

  /** 0 = played most recently, -1 = not in memory. */
  storyRecency(id: string): number {
    return this.stories.indexOfRecent((entry) => entry.id === id);
  }

  categoryRecency(category: StoryCategory): number {
    return this.stories.indexOfRecent((entry) => entry.category === category);
  }

  destinationRecency(destination: string): number {
    return this.stories.indexOfRecent((entry) => entry.destination === destination);
  }

  cooldownRemaining(id: string, nowMs: number): number {
    const until = this.cooldowns.get(id);
    return until === undefined ? 0 : Math.max(0, until - nowMs);
  }

  msSinceCategory(category: StoryCategory, nowMs: number): number {
    const at = this.categoryLastAt.get(category);
    return at === undefined ? Number.POSITIVE_INFINITY : nowMs - at;
  }

  /** Whether an event of this id landed inside the window. */
  sawEvent(id: MindEventId, nowMs: number, windowMs: number): boolean {
    return (
      this.events.indexOfRecent(
        (entry) => entry.id === id && nowMs - entry.atMs <= windowMs
      ) >= 0
    );
  }

  recentStoryIds(): string[] {
    return this.stories.toArray().map((entry) => entry.id);
  }

  recentEventIds(): MindEventId[] {
    return this.events.toArray().map((entry) => entry.id);
  }

  cooldownList(nowMs: number): { id: string; remainingMs: number }[] {
    const out: { id: string; remainingMs: number }[] = [];
    this.cooldowns.forEach((until, id) => {
      const remaining = until - nowMs;
      if (remaining > 0) out.push({ id, remainingMs: remaining });
    });
    out.sort((a, b) => b.remainingMs - a.remainingMs);
    return out;
  }
}
