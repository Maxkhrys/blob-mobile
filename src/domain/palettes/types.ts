/**
 * Canonical Cloud Palette Types
 * Synchronized with LCDPROTO: components/experimental/cloud-blob/cloudTypes.ts & lib/cloudPresets.ts
 */

import { CloudColourConfig } from '../character/types';

export interface CloudColourPreset {
  id: string;
  name: string;
  label: string;
  builtIn: boolean;
  colour: CloudColourConfig;
  /** UI representation colours */
  previewSwatch: string;
  previewBorder: string;
  accent: string;
  textColor: string;
}

export type PresetId =
  | 'cloud-white'
  | 'cloud-blue'
  | 'cool-mist'
  | 'purple-void'
  | 'baby-blue'
  | 'emerald-vapor'
  | 'blush-rose'
  | 'golden-dawn';
