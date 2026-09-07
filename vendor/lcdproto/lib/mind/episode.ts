/** Persistent motivation, not a new mood on each performance. */
import type { Drives, StoryCategory } from './types';
export type Episode = 'CURIOUS' | 'PLAYFUL' | 'SLEEPY' | 'SHY' | 'MISCHIEF' | 'BORED' | 'AFFECTIONATE' | 'STARTLED' | 'IDLE' | 'ANNOYED';
export const EPISODE_CATEGORIES: Record<Episode, readonly StoryCategory[]> = {
  CURIOUS: ['CURIOUS', 'IDLE'], PLAYFUL: ['PLAYFUL', 'HAPPY', 'MISCHIEF'],
  SLEEPY: ['SLEEPY', 'IDLE'], SHY: ['SHY', 'AFFECTIONATE'],
  MISCHIEF: ['MISCHIEF', 'PLAYFUL'], BORED: ['IDLE', 'CURIOUS'],
  AFFECTIONATE: ['AFFECTIONATE', 'SHY', 'HAPPY'], STARTLED: ['SURPRISED'],
  IDLE: ['IDLE', 'CURIOUS'], ANNOYED: ['ANNOYED', 'MISCHIEF'],
};
export function motivation(d: Drives): Episode {
  if (d.startle > 0.6) return 'STARTLED';
  if (d.patience < 0.2) return 'ANNOYED';
  if (d.sleepiness > 0.7) return 'SLEEPY';
  if (d.confidence < 0.25) return 'SHY';
  if (d.boredom > 0.75) return 'BORED';
  if (d.mischief > 0.72) return 'MISCHIEF';
  if (d.affection > 0.8) return 'AFFECTIONATE';
  if (d.playfulness > 0.75) return 'PLAYFUL';
  return 'CURIOUS';
}

/** Weighted motivations vary over episodes, constrained by current capacity. */
export function chooseEpisode(d: Drives, roll: number): Episode {
  if (d.startle > 0.6 || d.patience < 0.2) return motivation(d);
  const awake = 1 - d.sleepiness;
  const weights: [Episode, number][] = [
    ['CURIOUS', d.curiosity * awake * 1.5],
    ['PLAYFUL', d.playfulness * d.energy * awake * 1.2],
    ['MISCHIEF', d.mischief * d.energy * awake * 0.65],
    ['AFFECTIONATE', d.affection * 0.45],
    ['SHY', (1 - d.confidence) * d.affection * 0.3],
    ['BORED', d.boredom * 0.4], ['SLEEPY', d.sleepiness * d.sleepiness * 0.9],
  ];
  let target = roll * weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [episode, weight] of weights) { target -= weight; if (target <= 0) return episode; }
  return 'CURIOUS';
}
