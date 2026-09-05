/**
 * Canonical Product State Character Colour Overrides
 * Synchronized with LCDPROTO: character state transitions & COLOUR_PRESETS
 */

import { ProductState } from './types';
import { CloudColourConfig } from '../character/types';

/**
 * Temporary character colours assigned to each product state.
 * Returns null for HOME so the character keeps the user's saved base palette.
 */
export const STATE_COLOUR_OVERRIDES: Record<ProductState, CloudColourConfig | null> = {
  HOME: null, // Uses user's saved Cloud palette

  SENSED: {
    // Green / Mint / Jade (Emerald Vapor)
    body: '#baf5db',
    innerGlow: '#18b584',
    edge: '#e8fff5',
    coreTint: '#227056',
    glowIntensity: 1.05,
    density: 0.94,
    translucency: 0.82,
  },

  APPROACHING: {
    // Aqua / Teal (Cool Mist variant)
    body: '#d8e6ff',
    innerGlow: '#4F86C6',
    edge: '#eaf3ff',
    coreTint: '#3FA9A0',
    glowIntensity: 1.0,
    density: 0.95,
    translucency: 0.82,
  },

  VERY_CLOSE: {
    // Warm Gold (Golden Dawn)
    body: '#ffe5b8',
    innerGlow: '#f58814',
    edge: '#fffbe8',
    coreTint: '#94581e',
    glowIntensity: 1.12,
    density: 0.95,
    translucency: 0.82,
  },

  TOGETHER: {
    // Coral / Peach (Blush Rose)
    body: '#ffd0e2',
    innerGlow: '#f54897',
    edge: '#fff2f7',
    coreTint: '#9c3866',
    glowIntensity: 1.15,
    density: 0.94,
    translucency: 0.82,
  },

  SYNC: {
    // Deep / Electric Blue
    body: '#b4c6ff',
    innerGlow: '#3050f8',
    edge: '#e0e7ff',
    coreTint: '#1e2b85',
    glowIntensity: 1.18,
    density: 0.96,
    translucency: 0.8,
  },

  CONNECTED: {
    // Sky Blue (Baby Blue)
    body: '#bce8ff',
    innerGlow: '#36a3f7',
    edge: '#eaf6ff',
    coreTint: '#3b6d9e',
    glowIntensity: 1.05,
    density: 0.92,
    translucency: 0.85,
  },

  RECOGNIZED: {
    // Violet / Lavender (Purple Void)
    body: '#c4a5ff',
    innerGlow: '#8d42ff',
    edge: '#f0e6ff',
    coreTint: '#542c8e',
    glowIntensity: 1.15,
    density: 0.98,
    translucency: 0.8,
  },

  GOODBYE: {
    // Indigo (parting transition)
    body: '#c7ceff',
    innerGlow: '#4f46e5',
    edge: '#e0e7ff',
    coreTint: '#312e81',
    glowIntensity: 1.0,
    density: 0.92,
    translucency: 0.84,
  },
};

export function getStateColourOverride(
  state: ProductState
): CloudColourConfig | null {
  return STATE_COLOUR_OVERRIDES[state] ?? null;
}
