import { IEncountersService } from './IEncountersService';
import { EncounterRecord } from '../../types';
import {
  LocalStorageService,
  DEFAULT_ENCOUNTERS,
} from '../storage/LocalStorageService';

export class MockEncountersService implements IEncountersService {
  private static instance: MockEncountersService;
  private encounters: EncounterRecord[] = DEFAULT_ENCOUNTERS;
  private listeners: Set<(encounters: EncounterRecord[]) => void> = new Set();

  public static getInstance(): MockEncountersService {
    if (!MockEncountersService.instance) {
      MockEncountersService.instance = new MockEncountersService();
    }
    return MockEncountersService.instance;
  }

  async init(): Promise<void> {
    const stored = await LocalStorageService.getEncounters();
    if (stored && stored.length > 0) {
      this.encounters = stored;
      this.notify();
    }
  }

  getEncounters(): EncounterRecord[] {
    return [...this.encounters];
  }

  async recordEncounter(
    data: Omit<EncounterRecord, 'id' | 'timestamp' | 'formattedTime'>
  ): Promise<EncounterRecord> {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedTime = `Today · ${hours}:${minutes}`;

    const newRecord: EncounterRecord = {
      id: `enc-${Date.now()}`,
      ...data,
      timestamp: Date.now(),
      formattedTime,
    };

    this.encounters.unshift(newRecord);
    await LocalStorageService.saveEncounters(this.encounters);
    this.notify();
    return newRecord;
  }

  async clearEncounters(): Promise<void> {
    this.encounters = [];
    await LocalStorageService.saveEncounters(this.encounters);
    this.notify();
  }

  subscribe(listener: (encounters: EncounterRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getEncounters());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getEncounters();
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        console.error('Error in encounters listener:', e);
      }
    });
  }
}
