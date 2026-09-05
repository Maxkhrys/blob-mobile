import { Driver, DriverStatus } from '../../types';

export interface IFriendsService {
  getDrivers(): Driver[];
  getDriverById(id: string): Driver | undefined;
  addDriver(name: string, carName?: string): Promise<Driver>;
  updateDriverStatus(id: string, status: DriverStatus): Promise<void>;
  subscribe(listener: (drivers: Driver[]) => void): () => void;
}
