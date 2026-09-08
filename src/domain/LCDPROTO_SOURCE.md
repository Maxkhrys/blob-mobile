# LCDPROTO Source of Truth Provenance

This document records the exact upstream LCDPROTO revision consumed by `blob-mobile`.

## Runtime Vendor Source

- **Repository**: `Maxkhrys/LCDPROTO`
- **Branch**: `feat/grok-terra-orientation-synthesis-v1`
- **Commit SHA**: `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`
- **Commit subject**: `feat(orientation): synthesise Terra 3D turning with Grok acting follow-through`

This is one coherent character-runtime snapshot. Mind, behaviours, mouths, primitives, orientation, physics, drag, and cloud lobe/render all come from that SHA. The previous mixed snapshot (`a9ce979` mind plus a 7d26 orientation subset) is replaced.

`vendor/lcdproto/manifest.json` stores SHA-256 for every copied file. `vendor/lcdproto/EXCLUSIONS.md` records every deliberately excluded source path and why. `lib/motionPreview.ts` is removed. It was a mobile-only approximation, not part of LCDPROTO.

## Character runtime closure

Started from `lib/behaviours/controller.ts` and `lib/mind/director.ts`, then followed relative and `@/` imports.

Included and required to execute the current character:

- `lib/behaviours/controller.ts`, `primitives.ts`, `mouths.ts`, `types.ts`, `index.ts`
- `lib/mind/**` including `director.ts`, `acting.ts`, `commands.ts`, `memory.ts`, `scoring.ts`, `performance.ts`, `spatial.ts`, `eventSense.ts`, `cloudFacing.ts`, and `catalogue/*` (signature, micro, rare, interaction, sleepy, happy, authoring, and the rest of the current catalogue)
- `lib/blobRig.ts`, `blobPhysics.ts`, `blobDrag.ts`, `blobIdle.ts`, `blobMind.ts`, `blobBehaviour.ts`, `blobCalibration.ts`, `expressionCatalog.ts`, `orientation.ts`, `poseTruth.ts`
- Cloud runtime: `cloudLobeSystem.ts`, `cloudRenderer.ts`, `cloudTypes.ts`, `cloudMistTrails.ts`, plus `cloudPerformance.ts` because the existing mobile host still constructs `PerformanceRunner`
- `components/blob/faceRenderer.ts` because the cloud renderer draws the canonical mouth/eyes through it
- `components/states/EnvironmentLayer.tsx` and `lib/environmentConfig.ts` for the existing scene/shadow extraction. The scene bundle binds `composeOrientation` and `rotateVec3` from the vendored orientation module.

Host metadata copied from the same SHA, not a second brain: `lib/characters.ts`, `characterTypes.ts`, `cloudPresets.ts`, `deviceStates.ts`, `expressions/coreExpressions.ts`, `expressions/types.ts`, `performances/*`, `screenCatalogue.ts`, `stateEmotionMap.ts`.

## Mobile adapter

`src/components/character/cloudCanvasRuntime.ts` is a platform host only. It instantiates the vendored `BehaviourController`, feeds touch through `InteractionSensor` / `BlobDragController`, and translates the canonical pose into the existing canvas renderer.

Developer buttons are a trigger wrapper: `playStory`, `setActingCycle`, `setActingIntensity`, `forceMindMood`, `thinkNow`, `reset`, and `trigger` for acrobat ids. They do not schedule a second mobile mind.

Facing follow-through delays are the source constants in `lib/mind/cloudFacing.ts`: eyes immediate, core `0.048s`, shell yaw `0.105s`, crown `0.145s`, mass `0.165s`.

Renderer safety clamps match web `CloudCharacter` / `HomeState`:

| Channel | WEB INPUT | MOBILE INPUT | CLAMP | FINAL OUTPUT |
| :--- | :--- | :--- | :--- | :--- |
| jelly squash | `blobScaleX/Y` | same pose | ±0.10 | body deform base |
| body deform | `bodyScaleX/Y` | same pose | ±0.34 | body scale |
| acting scale X | `body.scaleX` | same | 0.72–1.55, then grab weight | `actingScaleX` |
| acting scale Y | `body.scaleY` | same | 0.70–1.60 | `actingScaleY` |
| grab smear | silhouette scale | same | 0.38 only while grabbed or on a wall | `scaleX/Y` |

`DEMO_60S_ADORABILITY` is authored inside `CherriMind` (`lib/mind/director.ts`), not the catalogue map. Mobile plays it through `BehaviourController.playStory` / `playAdorabilityDemo`.

## Developer route

`/motion-preview` is the developer brain lab. It is not a visual imitation sequencer.
