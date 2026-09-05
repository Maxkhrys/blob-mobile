import { IDeviceService } from './IDeviceService';
import { Device, DeviceConnectionState, SleepMode } from '../../types';
import {
  LocalStorageService,
  DEFAULT_DEVICES,
} from '../storage/LocalStorageService';

export class MockDeviceService implements IDeviceService {
  private static instance: MockDeviceService;
  private devices: Device[] = DEFAULT_DEVICES;
  private listeners: Set<(devices: Device[]) => void> = new Set();

  public static getInstance(): MockDeviceService {
    if (!MockDeviceService.instance) {
      MockDeviceService.instance = new MockDeviceService();
    }
    return MockDeviceService.instance;
  }

  async init(): Promise<void> {
    const stored = await LocalStorageService.getDevices();
    if (stored && stored.length > 0) {
      this.devices = stored;
      this.notify();
    }
  }

  getDevices(): Device[] {
    return [...this.devices];
  }

  getPrimaryDevice(): Device {
    return this.devices[0] || DEFAULT_DEVICES[0];
  }

  async setConnectionState(
    deviceId: string,
    state: DeviceConnectionState
  ): Promise<void> {
    this.devices = this.devices.map((d) =>
      d.id === deviceId
        ? {
            ...d,
            state,
            lastSynced: state === 'Connected' ? 'Just now' : d.lastSynced,
          }
        : d
    );
    await LocalStorageService.saveDevices(this.devices);
    this.notify();
  }

  async setBrightness(deviceId: string, brightness: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(brightness)));
    this.devices = this.devices.map((d) =>
      d.id === deviceId ? { ...d, brightness: clamped } : d
    );
    await LocalStorageService.saveDevices(this.devices);
    this.notify();
  }

  async setSleepMode(deviceId: string, sleepMode: SleepMode): Promise<void> {
    this.devices = this.devices.map((d) =>
      d.id === deviceId ? { ...d, sleepMode } : d
    );
    await LocalStorageService.saveDevices(this.devices);
    this.notify();
  }

  async reconnect(deviceId: string): Promise<void> {
    await this.setConnectionState(deviceId, 'Reconnecting');
    // Simulate brief reconnection sequence
    setTimeout(async () => {
      await this.setConnectionState(deviceId, 'Connected');
    }, 1200);
  }

  subscribe(listener: (devices: Device[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDevices());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getDevices();
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        console.error('Error in device listener:', e);
      }
    });
  }
}
