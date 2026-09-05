import { IProximityService } from './IProximityService';
import { ProximityPayload } from '../../types';

export class MockProximityService implements IProximityService {
  private static instance: MockProximityService;
  private currentPayload: ProximityPayload = {
    state: 'HOME',
    timestamp: Date.now(),
  };
  private listeners: Set<(payload: ProximityPayload) => void> = new Set();

  public static getInstance(): MockProximityService {
    if (!MockProximityService.instance) {
      MockProximityService.instance = new MockProximityService();
    }
    return MockProximityService.instance;
  }

  getState(): ProximityPayload {
    return { ...this.currentPayload };
  }

  setState(payload: Partial<ProximityPayload>): void {
    this.currentPayload = {
      ...this.currentPayload,
      ...payload,
      timestamp: Date.now(),
    };
    this.notify();
  }

  reset(): void {
    this.currentPayload = {
      state: 'HOME',
      driverId: undefined,
      driverName: undefined,
      direction: undefined,
      distanceMeters: undefined,
      closingSpeedMps: undefined,
      timestamp: Date.now(),
    };
    this.notify();
  }

  subscribe(listener: (payload: ProximityPayload) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const payload = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('Error in proximity listener:', e);
      }
    });
  }
}
