import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  Device,
  Driver,
  EncounterRecord,
} from '../../types';

const STORAGE_KEYS = {
  PROFILE: '@blob_mobile_profile',
  DEVICES: '@blob_mobile_devices',
  DRIVERS: '@blob_mobile_drivers',
  ENCOUNTERS: '@blob_mobile_encounters',
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  username: 'Max',
  carName: 'Audi',
  characterName: 'Lumi',
  characterColour: 'blue',
  environment: 'zen',
  privacyMode: 'friends-only',
  notifications: {
    friendNearby: true,
    friendApproaching: true,
    recognizedFriend: true,
  },
  onboardingCompleted: false,
};

export const DEFAULT_DEVICES: Device[] = [
  {
    id: 'cloud-display-01',
    name: 'Cloud Display',
    state: 'Connected',
    battery: 92,
    brightness: 80,
    sleepMode: 'sleep-when-parked',
    firmwareVersion: 'v1.2.0-mock',
    lastSynced: 'Just now',
  },
];

export const DEFAULT_DRIVERS: Driver[] = [
  {
    id: 'alex',
    name: 'Alex',
    carName: 'Audi RS3',
    avatarColor: '#3B82F6',
    avatarInitials: 'AL',
    status: 'Offline',
    lastSeen: '2h ago',
  },
  {
    id: 'jamie',
    name: 'Jamie',
    carName: 'Golf R',
    avatarColor: '#10B981',
    avatarInitials: 'JM',
    status: 'Online',
    lastSeen: 'Active now',
  },
  {
    id: 'sam',
    name: 'Sam',
    carName: 'Mini Cooper',
    avatarColor: '#8B5CF6',
    avatarInitials: 'SM',
    status: 'Offline',
    lastSeen: 'Yesterday',
  },
];

export const DEFAULT_ENCOUNTERS: EncounterRecord[] = [
  {
    id: 'enc-01',
    driverId: 'alex',
    driverName: 'Alex',
    driverCar: 'Audi RS3',
    type: 'together',
    timestamp: Date.now() - 1000 * 60 * 180,
    formattedTime: 'Today · 13:42',
    durationMinutes: 4,
    narrative: 'Together for 4 min',
  },
  {
    id: 'enc-02',
    driverId: 'jamie',
    driverName: 'Jamie',
    driverCar: 'Golf R',
    type: 'passed-nearby',
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
    formattedTime: 'Yesterday · 18:17',
    narrative: 'Passed nearby',
  },
  {
    id: 'enc-03',
    driverId: 'sam',
    driverName: 'Sam',
    driverCar: 'Mini Cooper',
    type: 'recognized',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    formattedTime: '2 Sep · 20:11',
    narrative: 'Recognized',
  },
];

export class LocalStorageService {
  static async getProfile(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        return { ...DEFAULT_USER_PROFILE, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load profile from storage:', e);
    }
    return DEFAULT_USER_PROFILE;
  }

  static async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to storage:', e);
    }
  }

  static async getDevices(): Promise<Device[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DEVICES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load devices from storage:', e);
    }
    return DEFAULT_DEVICES;
  }

  static async saveDevices(devices: Device[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    } catch (e) {
      console.warn('Failed to save devices to storage:', e);
    }
  }

  static async getDrivers(): Promise<Driver[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DRIVERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load drivers from storage:', e);
    }
    return DEFAULT_DRIVERS;
  }

  static async saveDrivers(drivers: Driver[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
    } catch (e) {
      console.warn('Failed to save drivers to storage:', e);
    }
  }

  static async getEncounters(): Promise<EncounterRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ENCOUNTERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load encounters from storage:', e);
    }
    return DEFAULT_ENCOUNTERS;
  }

  static async saveEncounters(encounters: EncounterRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ENCOUNTERS,
        JSON.stringify(encounters)
      );
    } catch (e) {
      console.warn('Failed to save encounters to storage:', e);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PROFILE,
        STORAGE_KEYS.DEVICES,
        STORAGE_KEYS.DRIVERS,
        STORAGE_KEYS.ENCOUNTERS,
      ]);
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }
}
