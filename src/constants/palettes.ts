import { CloudColourPreset } from '../types';

export const CLOUD_COLOUR_PRESETS: CloudColourPreset[] = [
  {
    id: 'white',
    label: 'Cloud White',
    primary: '#F8FAFC',
    glow: 'rgba(255, 255, 255, 0.85)',
    border: '#CBD5E1',
    accent: '#64748B',
    textColor: '#1E293B',
  },
  {
    id: 'blue',
    label: 'Cloud Blue',
    primary: '#BAE6FD',
    glow: 'rgba(186, 230, 253, 0.75)',
    border: '#7DD3FC',
    accent: '#0284C7',
    textColor: '#0369A1',
  },
  {
    id: 'pink',
    label: 'Cloud Pink',
    primary: '#FBCFE8',
    glow: 'rgba(251, 207, 232, 0.75)',
    border: '#F472B6',
    accent: '#DB2777',
    textColor: '#BE185D',
  },
  {
    id: 'lavender',
    label: 'Cloud Lavender',
    primary: '#E9D5FF',
    glow: 'rgba(233, 213, 255, 0.75)',
    border: '#C084FC',
    accent: '#9333EA',
    textColor: '#7E22CE',
  },
  {
    id: 'mint',
    label: 'Cloud Mint',
    primary: '#BBF7D0',
    glow: 'rgba(187, 247, 208, 0.75)',
    border: '#4ADE80',
    accent: '#16A34A',
    textColor: '#15803D',
  },
  {
    id: 'peach',
    label: 'Cloud Peach',
    primary: '#FED7AA',
    glow: 'rgba(254, 215, 170, 0.75)',
    border: '#FB923C',
    accent: '#EA580C',
    textColor: '#C2410C',
  },
];

export function getCloudColourPreset(id: string): CloudColourPreset {
  return (
    CLOUD_COLOUR_PRESETS.find((preset) => preset.id === id) ||
    CLOUD_COLOUR_PRESETS[1] // Default to Cloud Blue
  );
}
