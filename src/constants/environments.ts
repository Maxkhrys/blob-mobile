/**
 * Canonical Environment presets re-exported for application UI
 * Synchronized with LCDPROTO: lib/environmentConfig.ts
 */

import { EnvironmentPreset } from '../types';
import {
  CANONICAL_ENVIRONMENTS,
  getEnvironmentById,
} from '../domain/environments/presets';

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = CANONICAL_ENVIRONMENTS.map(
  (env) => ({
    id: env.id as any,
    label: env.label,
    description: env.description,
    bgColor: env.bgColor,
    surfaceColor: env.surfaceColor,
    accentColor: env.accentColor,
    textColor: env.textColor,
    badge: env.badge,
  })
);

export function getEnvironmentPreset(id: string): EnvironmentPreset {
  const env = getEnvironmentById(id);
  return {
    id: env.id as any,
    label: env.label,
    description: env.description,
    bgColor: env.bgColor,
    surfaceColor: env.surfaceColor,
    accentColor: env.accentColor,
    textColor: env.textColor,
    badge: env.badge,
  };
}
