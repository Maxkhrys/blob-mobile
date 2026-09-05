/**
 * Canonical Expression & Behaviour Types
 * Synchronized with LCDPROTO: lib/blobBehaviour.ts & lib/expressionCatalog.ts
 */

export type BehaviourId =
  // Gaze
  | 'GLANCE_LEFT'
  | 'GLANCE_RIGHT'
  | 'LOOK_UP'
  | 'LOOK_DOWN'
  | 'CURIOUS_TILT_LEFT'
  | 'CURIOUS_TILT_RIGHT'
  // Lids & Eyes
  | 'NORMAL_BLINK'
  | 'DOUBLE_BLINK'
  | 'SOFT_SQUINT'
  | 'ONE_EYE_SQUINT_LEFT'
  | 'ONE_EYE_SQUINT_RIGHT'
  | 'CURIOUS_WIDE'
  // Anime / Emotions
  | 'HAPPY_EYES'
  | 'EXCITED_EYES'
  | 'ANGRY_EYES'
  | 'SHY_EYES'
  | 'SLEEPY_EYES'
  | 'SAD_EYES'
  | 'CONFUSED_EYES'
  | 'LOVE_EYES'
  | 'PANIC_EYES'
  | 'DEADPAN_EYES'
  // Body & Big Beats
  | 'BODY_SETTLE'
  | 'TINY_SQUISH'
  | 'LAUGH_SQUISH'
  | 'EXCITED_WIGGLE'
  | 'JOY_HOP'
  | 'SURPRISE_POP'
  | 'CURIOUS_DOUBLE_TAKE'
  // Mouth
  | 'MOUTH_RELAX'
  | 'MOUTH_TWITCH'
  | 'MOUTH_O'
  | 'MOUTH_FLIP';

export interface ConsumerEmotionAction {
  id: string;
  label: string;
  behaviourId: BehaviourId;
  performanceId?: string;
  description: string;
}
