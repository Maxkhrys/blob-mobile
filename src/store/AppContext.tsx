import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  UserProfile,
  Device,
  Driver,
  EncounterRecord,
  ProximityPayload,
  ProximityState,
  CloudEmotion,
  DeviceConnectionState,
  SleepMode,
  DriverStatus,
} from '../types';
import {
  LocalStorageService,
  DEFAULT_USER_PROFILE,
} from '../services/storage/LocalStorageService';
import { MockDeviceService } from '../services/device/MockDeviceService';
import { MockFriendsService } from '../services/friends/MockFriendsService';
import { MockEncountersService } from '../services/encounters/MockEncountersService';
import { MockProximityService } from '../services/proximity/MockProximityService';

interface AppContextType {
  isReady: boolean;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  resetOnboarding: () => Promise<void>;

  devices: Device[];
  device: Device;
  setDeviceConnection: (state: DeviceConnectionState) => Promise<void>;
  setDeviceBrightness: (val: number) => Promise<void>;
  setDeviceSleepMode: (mode: SleepMode) => Promise<void>;
  reconnectDevice: () => Promise<void>;

  proximity: ProximityPayload;
  setProximityState: (
    state: ProximityState,
    driverId?: string,
    driverName?: string,
    direction?: 'left' | 'right' | 'ahead' | 'behind',
    distanceMeters?: number,
    closingSpeedMps?: number
  ) => Promise<void>;
  resetProximity: () => void;

  drivers: Driver[];
  addDriver: (name: string, carName?: string) => Promise<Driver>;
  updateDriverStatus: (id: string, status: DriverStatus) => Promise<void>;

  encounters: EncounterRecord[];
  recordEncounter: (
    data: Omit<EncounterRecord, 'id' | 'timestamp' | 'formattedTime'>
  ) => Promise<EncounterRecord>;
  clearEncounters: () => Promise<void>;

  cloudEmotion: CloudEmotion;
  triggerEmotion: (emotion: CloudEmotion) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Singletons at module level
const deviceService = MockDeviceService.getInstance();
const friendsService = MockFriendsService.getInstance();
const encountersService = MockEncountersService.getInstance();
const proximityService = MockProximityService.getInstance();

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [devices, setDevices] = useState<Device[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [proximity, setProximity] = useState<ProximityPayload>(() => ({
    state: 'HOME',
    timestamp: 0,
  }));
  const [cloudEmotion, setCloudEmotion] = useState<CloudEmotion>('idle');

  // Initialize and hydrate from storage
  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        const storedProfile = await LocalStorageService.getProfile();
        await deviceService.init();
        await friendsService.init();
        await encountersService.init();

        if (isMounted) {
          setProfile(storedProfile);
          setDevices(deviceService.getDevices());
          setDrivers(friendsService.getDrivers());
          setEncounters(encountersService.getEncounters());
          setProximity(proximityService.getState());
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize app state:', err);
        if (isMounted) setIsReady(true);
      }
    }

    initApp();

    const unsubDevice = deviceService.subscribe((devs) => {
      if (isMounted) setDevices(devs);
    });

    const unsubFriends = friendsService.subscribe((drs) => {
      if (isMounted) setDrivers(drs);
    });

    const unsubEncounters = encountersService.subscribe((encs) => {
      if (isMounted) setEncounters(encs);
    });

    const unsubProximity = proximityService.subscribe((prox) => {
      if (isMounted) setProximity(prox);
    });

    return () => {
      isMounted = false;
      unsubDevice();
      unsubFriends();
      unsubEncounters();
      unsubProximity();
    };
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const updated = { ...profile, ...patch };
      setProfile(updated);
      await LocalStorageService.saveProfile(updated);
    },
    [profile]
  );

  const completeOnboarding = useCallback(
    async (data: Partial<UserProfile>) => {
      const updated: UserProfile = {
        ...profile,
        ...data,
        onboardingCompleted: true,
      };
      setProfile(updated);
      await LocalStorageService.saveProfile(updated);
    },
    [profile]
  );

  const resetOnboarding = useCallback(async () => {
    const reset = { ...profile, onboardingCompleted: false };
    setProfile(reset);
    await LocalStorageService.saveProfile(reset);
  }, [profile]);

  const primaryDevice = devices[0] || {
    id: 'cloud-display-01',
    name: 'Cloud Display',
    state: 'Connected' as DeviceConnectionState,
    battery: 92,
    brightness: 80,
    sleepMode: 'sleep-when-parked' as SleepMode,
    firmwareVersion: 'v1.2.0-mock',
    lastSynced: 'Just now',
  };

  const setDeviceConnection = useCallback(
    async (state: DeviceConnectionState) => {
      await deviceService.setConnectionState(primaryDevice.id, state);
    },
    [primaryDevice.id]
  );

  const setDeviceBrightness = useCallback(
    async (val: number) => {
      await deviceService.setBrightness(primaryDevice.id, val);
    },
    [primaryDevice.id]
  );

  const setDeviceSleepMode = useCallback(
    async (mode: SleepMode) => {
      await deviceService.setSleepMode(primaryDevice.id, mode);
    },
    [primaryDevice.id]
  );

  const reconnectDevice = useCallback(async () => {
    await deviceService.reconnect(primaryDevice.id);
  }, [primaryDevice.id]);

  const setProximityState = useCallback(
    async (
      state: ProximityState,
      driverId?: string,
      driverName?: string,
      direction?: 'left' | 'right' | 'ahead' | 'behind',
      distanceMeters?: number,
      closingSpeedMps?: number
    ) => {
      // Find driver info if driverId passed
      const targetDriver = driverId
        ? friendsService.getDriverById(driverId)
        : undefined;

      const resolvedName = driverName || targetDriver?.name || 'Alex';
      const resolvedDriverId = driverId || targetDriver?.id || 'alex';

      // Update proximity service
      proximityService.setState({
        state,
        driverId: resolvedDriverId,
        driverName: resolvedName,
        direction: direction || 'ahead',
        distanceMeters:
          distanceMeters !== undefined
            ? distanceMeters
            : state === 'SENSED'
            ? 120
            : state === 'APPROACHING'
            ? 75
            : state === 'VERY_CLOSE'
            ? 18
            : state === 'TOGETHER'
            ? 5
            : 0,
        closingSpeedMps: closingSpeedMps || 8,
      });

      // Synchronize driver's status
      if (resolvedDriverId) {
        let driverStatus: DriverStatus = 'Offline';
        if (state === 'HOME') driverStatus = 'Online';
        else if (state === 'SENSED') driverStatus = 'Nearby';
        else if (state === 'APPROACHING') driverStatus = 'Approaching';
        else if (state === 'VERY_CLOSE') driverStatus = 'Very close';
        else if (state === 'TOGETHER' || state === 'SYNC' || state === 'CONNECTED')
          driverStatus = 'Together';
        else if (state === 'RECOGNIZED') driverStatus = 'Nearby';
        else if (state === 'GOODBYE') driverStatus = 'Online';

        await friendsService.updateDriverStatus(resolvedDriverId, driverStatus);
      }

      // Automatically create encounter record on GOODBYE or when finishing Together session
      if (state === 'GOODBYE') {
        await encountersService.recordEncounter({
          driverId: resolvedDriverId,
          driverName: resolvedName,
          driverCar: targetDriver?.carName || 'Vehicle',
          type: 'together',
          durationMinutes: 3,
          narrative: `Together with ${resolvedName} for 3 min`,
        });
      }
    },
    []
  );

  const resetProximity = useCallback(() => {
    proximityService.reset();
  }, []);

  const addDriver = useCallback(
    async (name: string, carName?: string) => {
      return await friendsService.addDriver(name, carName);
    },
    []
  );

  const updateDriverStatus = useCallback(
    async (id: string, status: DriverStatus) => {
      await friendsService.updateDriverStatus(id, status);
    },
    []
  );

  const recordEncounter = useCallback(
    async (
      data: Omit<EncounterRecord, 'id' | 'timestamp' | 'formattedTime'>
    ) => {
      return await encountersService.recordEncounter(data);
    },
    []
  );

  const clearEncounters = useCallback(async () => {
    await encountersService.clearEncounters();
  }, []);

  const triggerEmotion = useCallback((emotion: CloudEmotion) => {
    setCloudEmotion(emotion);
    // Reset to idle after 3 seconds
    setTimeout(() => {
      setCloudEmotion((current) => (current === emotion ? 'idle' : current));
    }, 3000);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isReady,
        profile,
        updateProfile,
        completeOnboarding,
        resetOnboarding,
        devices,
        device: primaryDevice,
        setDeviceConnection,
        setDeviceBrightness,
        setDeviceSleepMode,
        reconnectDevice,
        proximity,
        setProximityState,
        resetProximity,
        drivers,
        addDriver,
        updateDriverStatus,
        encounters,
        recordEncounter,
        clearEncounters,
        cloudEmotion,
        triggerEmotion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppContextProvider');
  }
  return context;
}
