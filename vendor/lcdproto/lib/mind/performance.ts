/** Mind V3 performance compiler. No destination inference from local acting. */
import type { BlobDestination } from '../blobMind';
import type { MindCue, MindPlan, StoryDef, FacingIntent, ReturnPolicy } from './types';
import type { GazeBehaviour } from '../behaviours/types';

const mirrorZone: Partial<Record<BlobDestination, BlobDestination>> = {
  LEFT: 'RIGHT', RIGHT: 'LEFT', UP_LEFT: 'UP_RIGHT', UP_RIGHT: 'UP_LEFT',
  DOWN_LEFT: 'DOWN_RIGHT', DOWN_RIGHT: 'DOWN_LEFT',
};
const mirrorGaze: Partial<Record<GazeBehaviour, GazeBehaviour>> = {
  GLANCE_LEFT: 'GLANCE_RIGHT', GLANCE_RIGHT: 'GLANCE_LEFT',
  CURIOUS_TILT_LEFT: 'CURIOUS_TILT_RIGHT', CURIOUS_TILT_RIGHT: 'CURIOUS_TILT_LEFT',
};
const mirrorFacing: Partial<Record<FacingIntent, FacingIntent>> = {
  LOOK_LEFT: 'LOOK_RIGHT', LOOK_RIGHT: 'LOOK_LEFT',
};

export function compilePerformance(
  def: StoryDef,
  fromZone: BlobDestination,
  mirror: boolean,
  tempo = 1,
  destinationOverride?: BlobDestination,
  returnPolicyOverride?: ReturnPolicy
): MindPlan {
  const zone = (z: BlobDestination) => mirror ? mirrorZone[z] ?? z : z;
  const profile = def.movementProfile ?? (
    def.category === 'SLEEPY' ? 'SLEEPY' : def.category === 'SHY' ? 'SHY' :
    def.category === 'AFFECTIONATE' ? 'AFFECTION' :
    ['HAPPY', 'PLAYFUL', 'MISCHIEF'].includes(def.category) ? 'PLAY' : 'EXPLORE');
  const cues: MindCue[] = def.beats.map(({ at, ...beat }) => ({
    ...beat, atMs: Math.round(at * tempo),
    gaze: beat.gaze && mirror ? mirrorGaze[beat.gaze] ?? beat.gaze : beat.gaze,
    facing: beat.facing && mirror ? mirrorFacing[beat.facing] ?? beat.facing : beat.facing,
    dir: beat.dir === undefined ? (mirror ? -1 : 1) : beat.dir * (mirror ? -1 : 1),
    destination: beat.destination ? (destinationOverride ?? zone(beat.destination)) : undefined,
  }));
  let finalZone = fromZone;
  for (const cue of cues) {
    if (cue.destination) {
      finalZone = cue.destination;
      cue.facing ??= 'FACE_TRAVEL';
      cue.movementMode ??= def.movementMode ?? 'TRAVEL';
      cue.movementProfile ??= profile;
    }
    if (cue.phase === 'RECOVERY') cue.facing ??= 'FORWARD';
  }
  // Only explicit non-centre staging or destinationOverride may generate travel. Default CENTER on an
  // old local story means "no destination", not "go home before breathing".
  const deliberateTarget = destinationOverride ?? (def.destination !== 'CENTER' && def.movementMode !== 'STAY' ? zone(def.destination) : undefined);
  if (!cues.some(c => c.destination) && deliberateTarget && deliberateTarget !== fromZone) {
    cues.push({ atMs: Math.round(650 * tempo), phase: 'ACTION', destination: deliberateTarget,
      facing: 'FACE_TRAVEL', movementMode: 'TRAVEL', movementProfile: profile });
    finalZone = deliberateTarget;
  }
  const travels = cues.filter(c => c.destination);
  // Eyes get a readable lead before each journey, without replacing authored looks.
  for (const travel of travels) {
    if (travel.atMs < 300 || cues.some(c => c.gaze && c.atMs < travel.atMs && c.atMs >= travel.atMs - 750)) continue;
    cues.push({ atMs: travel.atMs - 300, phase: 'NOTICE',
      gaze: travel.destination!.includes('LEFT') ? 'GLANCE_LEFT' :
        travel.destination!.includes('RIGHT') ? 'GLANCE_RIGHT' : 'LOOK_DOWN' });
  }
  cues.sort((a, b) => a.atMs - b.atMs);
  const duration = Math.round(def.durationMs * tempo);
  if (!def.holdFacing) cues.push({ atMs: duration - 150, phase: 'RECOVERY', facing: 'FORWARD' });
  cues.sort((a, b) => a.atMs - b.atMs);
  return {
    storyId: def.id, category: def.category, rarity: def.rarity,
    intention: def.intention, destination: finalZone, durationMs: duration,
    priority: def.priority, interruptible: def.interruptible,
    phaseCount: new Set(cues.map(c => c.phase)).size, cues,
    movementMode: travels.length ? def.movementMode ?? 'TRAVEL' : 'STAY',
    movementProfile: profile, returnPolicy: returnPolicyOverride ?? def.returnPolicy ?? 'HOLD',
    fromZone, toZone: finalZone, facing: def.facing ?? 'FORWARD', holdFacing: def.holdFacing ?? false,
  };
}
