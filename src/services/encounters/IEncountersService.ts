import { EncounterRecord } from '../../types';

export interface IEncountersService {
  getEncounters(): EncounterRecord[];
  recordEncounter(
    encounter: Omit<EncounterRecord, 'id' | 'timestamp' | 'formattedTime'>
  ): Promise<EncounterRecord>;
  clearEncounters(): Promise<void>;
  subscribe(listener: (encounters: EncounterRecord[]) => void): () => void;
}
