import { Device, DeviceConnectionState, SleepMode } from '../../types';

export interface IDeviceService {
  getDevices(): Device[];
  getPrimaryDevice(): Device;
  setConnectionState(deviceId: string, state: DeviceConnectionState): Promise<void>;
  setBrightness(deviceId: string, brightness: number): Promise<void>;
  setSleepMode(deviceId: string, sleepMode: SleepMode): Promise<void>;
  reconnect(deviceId: string): Promise<void>;
  subscribe(listener: (devices: Device[]) => void): () => void;
}
