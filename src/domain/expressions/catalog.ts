/**
 * Canonical Expression Catalog & Mobile Action Mapping
 * Synchronized with LCDPROTO: lib/expressionCatalog.ts
 */

import { ConsumerEmotionAction } from './types';

export const CONSUMER_TEST_EMOTIONS: readonly ConsumerEmotionAction[] = [
  {
    id: 'happy',
    label: 'Happy',
    behaviourId: 'HAPPY_EYES',
    performanceId: 'LAUGH_SQUISH',
    description: 'Lifted brows, cheerful eye squint, bouncy squash',
  },
  {
    id: 'curious',
    label: 'Curious',
    behaviourId: 'CURIOUS_TILT_LEFT',
    performanceId: 'CURIOUS_DOUBLE_TAKE',
    description: 'Alert tilt, wide gaze following periphery',
  },
  {
    id: 'sleepy',
    label: 'Sleepy',
    behaviourId: 'SLEEPY_EYES',
    performanceId: 'BODY_SETTLE',
    description: 'Heavy lids, relaxed posture, slowed breathing',
  },
  {
    id: 'excited',
    label: 'Excited',
    behaviourId: 'EXCITED_EYES',
    performanceId: 'EXCITED_WIGGLE',
    description: 'High arousal wide eyes, happy billow flutter',
  },
  {
    id: 'surprised',
    label: 'Surprised',
    behaviourId: 'SURPRISE_POP',
    performanceId: 'SURPRISE_POP',
    description: 'Instant upward pop, wide circular mouth, focal lock',
  },
] as const;

export function getConsumerEmotion(id: string): ConsumerEmotionAction {
  return (
    CONSUMER_TEST_EMOTIONS.find((e) => e.id === id) ?? CONSUMER_TEST_EMOTIONS[0]
  );
}
