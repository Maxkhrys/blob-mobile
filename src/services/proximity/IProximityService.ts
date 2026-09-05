import { ProximityPayload } from '../../types';

export interface IProximityService {
  getState(): ProximityPayload;
  setState(payload: Partial<ProximityPayload>): void;
  subscribe(listener: (payload: ProximityPayload) => void): () => void;
  reset(): void;
}
