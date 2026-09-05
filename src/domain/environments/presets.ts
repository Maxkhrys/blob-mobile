/**
 * Canonical Environment Presets
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/environmentConfig.ts
 */

import { EnvironmentPreset } from './types';

export const CANONICAL_ENVIRONMENTS: EnvironmentPreset[] = [
  {
    id: 'zen',
    label: 'Zen / Sand',
    displayMode: 'warm',
    screenColour: '#cfc3b4',
    description: 'Calm sand and warm stone ambience. Soft, grounded natural light.',
    bgColor: '#F5F3EF',
    surfaceColor: '#FFFFFF',
    accentColor: '#8C7862',
    textColor: '#38322B',
    badge: 'Warm Stone',
  },
  {
    id: 'dark',
    label: 'Dark',
    displayMode: 'dark',
    screenColour: '#000000',
    description: 'Stealth contrast optimized for cabin AMOLED black depth. Hardware OLED default.',
    bgColor: '#0D0F12',
    surfaceColor: '#171A1F',
    accentColor: '#60A5FA',
    textColor: '#F3F4F6',
    badge: 'AMOLED',
  },
  {
    id: 'sky',
    label: 'Sky',
    displayMode: 'dark',
    screenColour: '#081426',
    description: 'Airy daylight atmosphere with calm horizon hues and gentle atmospheric dust.',
    bgColor: '#F0F7FF',
    surfaceColor: '#FFFFFF',
    accentColor: '#0284C7',
    textColor: '#0F172A',
    badge: 'Daylight',
  },
  {
    id: 'warm',
    label: 'Warm Glow',
    displayMode: 'brown',
    screenColour: '#a58d76',
    description: 'Subtle golden cabin warmth and dusk ember tones. Cozy night drive feel.',
    bgColor: '#FFF8F0',
    surfaceColor: '#FFFFFF',
    accentColor: '#D97706',
    textColor: '#451A03',
    badge: 'Cabin Dusk',
  },
];

export const DEFAULT_ENVIRONMENT = CANONICAL_ENVIRONMENTS[0]; // Zen / Sand

export function getEnvironmentById(id: string): EnvironmentPreset {
  return (
    CANONICAL_ENVIRONMENTS.find(
      (e) => e.id === id || (id === 'warm-glow' && e.id === 'warm')
    ) || DEFAULT_ENVIRONMENT
  );
}
