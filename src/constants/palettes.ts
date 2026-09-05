/**
 * Canonical Cloud Palettes re-exported for application UI
 * Synchronized with LCDPROTO: lib/cloudPresets.ts
 */

import { CloudColourPreset } from '../types';
import {
  CANONICAL_CLOUD_PRESETS,
  getCloudPresetById,
} from '../domain/palettes/presets';

export const CLOUD_COLOUR_PRESETS: CloudColourPreset[] = CANONICAL_CLOUD_PRESETS.map(
  (p) => ({
    id: (p.id === 'cloud-white'
      ? 'white'
      : p.id === 'cloud-blue'
      ? 'blue'
      : p.id === 'emerald-vapor'
      ? 'mint'
      : p.id === 'purple-void'
      ? 'lavender'
      : p.id === 'blush-rose'
      ? 'pink'
      : p.id === 'golden-dawn'
      ? 'peach'
      : p.id) as any,
    label: p.name,
    primary: p.previewSwatch,
    glow: p.colour.innerGlow,
    border: p.previewBorder,
    accent: p.accent,
    textColor: p.textColor,
  })
);

export function getCloudColourPreset(id: string): CloudColourPreset {
  const canon = getCloudPresetById(id);
  return {
    id: id as any,
    label: canon.name,
    primary: canon.previewSwatch,
    glow: canon.colour.innerGlow,
    border: canon.previewBorder,
    accent: canon.accent,
    textColor: canon.textColor,
  };
}
