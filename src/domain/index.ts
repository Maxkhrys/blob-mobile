/**
 * Canonical Product Domain Layer
 * Source of truth synchronized with LCDPROTO
 */

import { ProductState } from './productStates/types';

export * from './character/types';
export * from './character/geometry';
export * from './palettes/types';
export * from './palettes/presets';
export * from './productStates/types';
export * from './productStates/stateEmotionMap';
export * from './productStates/statePalettes';
export * from './environments/types';
export * from './environments/presets';
export * from './expressions/types';
export * from './expressions/catalog';
export * from './protocol/deviceCommand';

// Backward compatibility type aliases for mobile UI layer
export type ProximityState = ProductState;
export type CloudEmotion =
  | 'idle'
  | 'happy'
  | 'curious'
  | 'sleepy'
  | 'excited'
  | 'surprised';

export type CloudColourId =
  | 'white'
  | 'blue'
  | 'pink'
  | 'lavender'
  | 'mint'
  | 'peach'
  | 'cloud-white'
  | 'cloud-blue'
  | 'cool-mist'
  | 'purple-void'
  | 'emerald-vapor'
  | 'blush-rose'
  | 'golden-dawn';
