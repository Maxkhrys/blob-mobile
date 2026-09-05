/**
 * Canonical Environment Types
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/environmentConfig.ts
 */

export type DisplayMode = 'dark' | 'warm' | 'brown';

export type EnvironmentId = 'zen' | 'dark' | 'sky' | 'warm';

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
