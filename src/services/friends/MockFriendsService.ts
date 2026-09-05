import { IFriendsService } from "./IFriendsService";
import { Driver, DriverStatus } from "../../types";
import {
  LocalStorageService,
  DEFAULT_DRIVERS,
} from "../storage/LocalStorageService";

const AVATAR_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
];

export class MockFriendsService implements IFriendsService {
  private static instance: MockFriendsService;
  private drivers: Driver[] = DEFAULT_DRIVERS;
  private listeners: Set<(drivers: Driver[]) => void> = new Set();

  public static getInstance(): MockFriendsService {
    if (!MockFriendsService.instance) {
      MockFriendsService.instance = new MockFriendsService();
    }
    return MockFriendsService.instance;
  }

  async init(): Promise<void> {
    const stored = await LocalStorageService.getDrivers();
    if (stored) {
      this.drivers = stored;
      this.notify();
    }
  }

  getDrivers(): Driver[] {
    return [...this.drivers];
  }

  getDriverById(id: string): Driver | undefined {
    return this.drivers.find((d) => d.id === id);
  }

  async addDriver(
    name: string,
    carName?: string,
    avatarUri?: string,
  ): Promise<Driver> {
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const initials = name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const randomColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newDriver: Driver = {
      id,
      name: name.trim(),
      carName: (carName || "Vehicle").trim(),
      avatarUri,
      avatarColor: randomColor,
      avatarInitials: initials || "DR",
      status: "Online",
      lastSeen: "Just added",
    };

    // Replace if exists or append
    const existingIndex = this.drivers.findIndex((d) => d.id === id);
    if (existingIndex >= 0) {
      this.drivers[existingIndex] = newDriver;
    } else {
      this.drivers.unshift(newDriver);
    }

    await LocalStorageService.saveDrivers(this.drivers);
    this.notify();
    return newDriver;
  }

  async updateDriverStatus(id: string, status: DriverStatus): Promise<void> {
    this.drivers = this.drivers.map((d) =>
      d.id === id ? { ...d, status, lastSeen: "Active now" } : d,
    );
    await LocalStorageService.saveDrivers(this.drivers);
    this.notify();
  }

  subscribe(listener: (drivers: Driver[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDrivers());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getDrivers();
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        console.error("Error in friends listener:", e);
      }
    });
  }
}
