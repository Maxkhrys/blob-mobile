/**
 * Canonical Environment Types
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/environmentConfig.ts
 */

export type DisplayMode = 'dark' | 'warm' | 'brown';

export type EnvironmentId =
  | 'scenic'
  | 'scenic-b'
  | 'bg-a'
  | 'bg-b'
  | 'zen'
  | 'dark'
  | 'warm'
  | 'sand'
  | 'amoled'
  | 'sky'
  | 'warm-glow';

export interface EnvironmentPreset {
  id: EnvironmentId;
  label: string;
  displayMode: DisplayMode;
  screenColour: string;
  description: string;
  bgColor: string;
  surfaceColor: string;
  accentColor: string;
  textColor: string;
  badge: string;
}
