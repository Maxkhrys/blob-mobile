/**
 * Canonical Product & Device States
 * Synchronized with LCDPROTO: lib/deviceStates.ts & lib/stateEmotionMap.ts
 */

export type ProductState =
  | 'HOME'
  | 'SENSED'
  | 'APPROACHING'
  | 'VERY_CLOSE'
  | 'TOGETHER'
  | 'SYNC'
  | 'CONNECTED'
  | 'RECOGNIZED'
  | 'GOODBYE';

export interface ProductStateMeta {
  id: ProductState;
  label: string;
  accent: string;
  description: string;
}

export interface StateEmotionConfig {
  stateId: ProductState;
  label: string;
  expressionId: string;
  performanceId: string;
  description: string;
  /** Normalized intimacy/engagement level: 0 (remote/idle) to 1.0 (fully synchronized/connected) */
  intimacyLevel: number;
  /** Body lean factor (-1 to +1) indicating physical approach posture */
  bodyLean: number;
  /** Depth bias (-1 to +1): positive is closer to the glass */
  depthBias: number;
  /** Pupil dilation multiplier (0.8 to 1.4) reflecting emotional arousal */
  pupilDilation: number;
}
