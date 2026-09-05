/**
 * Canonical Phone -> Device Hardware Command Protocol
 * High-level domain command schema for future BLE / Serial ESP32 connection
 */

import { ProductState } from '../productStates/types';
import { EnvironmentId } from '../environments/types';
import { BehaviourId } from '../expressions/types';

export type DeviceCommandType =
  | 'SET_PRODUCT_STATE'
  | 'SET_BASE_PALETTE'
  | 'SET_ENVIRONMENT'
  | 'SET_BRIGHTNESS'
  | 'SET_SLEEP_MODE'
  | 'TRIGGER_EXPRESSION'
  | 'SET_CHARACTER_NAME';

export interface SetProductStateCommand {
  type: 'SET_PRODUCT_STATE';
  state: ProductState;
  driverId?: string;
  driverName?: string;
  direction?: 'ahead' | 'left' | 'right' | 'behind';
  distanceMeters?: number;
  closingSpeedMps?: number;
}

export interface SetBasePaletteCommand {
  type: 'SET_BASE_PALETTE';
  presetId: string;
}

export interface SetEnvironmentCommand {
  type: 'SET_ENVIRONMENT';
  environmentId: EnvironmentId;
}

export interface SetBrightnessCommand {
  type: 'SET_BRIGHTNESS';
  brightness: number; // 0 - 100
}

export interface SetSleepModeCommand {
  type: 'SET_SLEEP_MODE';
  sleepMode: 'always-awake' | 'sleep-when-parked' | 'scheduled-auto';
}

export interface TriggerExpressionCommand {
  type: 'TRIGGER_EXPRESSION';
  behaviourId: BehaviourId;
}

export interface SetCharacterNameCommand {
  type: 'SET_CHARACTER_NAME';
  name: string;
}

export type DeviceCommand =
  | SetProductStateCommand
  | SetBasePaletteCommand
  | SetEnvironmentCommand
  | SetBrightnessCommand
  | SetSleepModeCommand
  | TriggerExpressionCommand
  | SetCharacterNameCommand;
