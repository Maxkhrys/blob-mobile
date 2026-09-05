import { EnvironmentPreset } from '../types';

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: 'zen',
    label: 'Zen / Sand',
    description: 'Calm warm sand and stone ambience. Soft and grounded.',
    bgColor: '#F5F3EF',
    surfaceColor: '#FFFFFF',
    accentColor: '#8C7862',
    textColor: '#38322B',
    badge: 'Zen',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Stealth contrast optimized for cabin AMOLED black depth.',
    bgColor: '#0D0F12',
    surfaceColor: '#171A1F',
    accentColor: '#60A5FA',
    textColor: '#F3F4F6',
    badge: 'OLED',
  },
  {
    id: 'sky',
    label: 'Sky',
    description: 'Airy daylight atmosphere with calm horizon hues.',
    bgColor: '#F0F7FF',
    surfaceColor: '#FFFFFF',
    accentColor: '#0284C7',
    textColor: '#0F172A',
    badge: 'Daylight',
  },
  {
    id: 'warm-glow',
    label: 'Warm Glow',
    description: 'Subtle golden cabin warmth and ember tones.',
    bgColor: '#FFF8F0',
    surfaceColor: '#FFFFFF',
    accentColor: '#D97706',
    textColor: '#451A03',
    badge: 'Cabin',
  },
];

export function getEnvironmentPreset(id: string): EnvironmentPreset {
  return (
    ENVIRONMENT_PRESETS.find((preset) => preset.id === id) ||
    ENVIRONMENT_PRESETS[0] // Default to Zen / Sand
  );
}
