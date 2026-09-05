# LCDPROTO Source of Truth Provenance

This document records the exact upstream LCDPROTO repository revision that `blob-mobile` is synchronized with.

## Upstream Repository
- **Repository**: `Maxkhrys/LCDPROTO`
- **Branch**: `feat/cloud-menu-ui-accents`
- **Commit SHA**: `95dafb92b5ba87683294698bb7ea89729fd148d4`
- **Commit Date**: `2026-09-05 14:04:20 +0100`
- **Commit Subject**: `feat(mobile): make simulator and controls fully mobile responsive`

## Synchronized Modules & Architectures

| LCDPROTO Source | Mobile Domain Module | Notes |
| :--- | :--- | :--- |
| `components/experimental/cloud-blob/cloudLobeSystem.ts` | `src/domain/character/` | Authored 8 primary lobes, 6 sub-puffs, 12 suspended droplets, spring physics |
| `components/experimental/cloud-blob/cloudRenderer.ts` | `src/components/character/` | Volumetric alpha stamps, directional lighting follow, 3D turning anticipation, curved face projection, ground contact shadow |
| `components/blob/faceRenderer.ts` | `src/components/character/` | Production black eyes (`eyeGeometry`), procedural brows, dynamic mouth (`drawMouthShape`) |
| `lib/cloudPresets.ts` | `src/domain/palettes/` | Built-in Cloud presets (`Cloud White`, `Cloud Blue`), custom preset schema |
| `lib/characters.ts` | `src/domain/character/` | Character identity, `CloudFaceSettings`, `CloudDeformationParams` |
| `lib/deviceStates.ts` | `src/domain/productStates/` | Canonical 8 device states (`HOME`, `SENSED`, `APPROACHING`, `VERY_CLOSE`, `TOGETHER`, `SYNC`, `CONNECTED`, `RECOGNIZED`) + `GOODBYE` |
| `lib/stateEmotionMap.ts` | `src/domain/productStates/` | Intimacy level, body lean, depth bias, pupil dilation, mapped expressions & performances |
| `lib/expressionCatalog.ts` | `src/domain/expressions/` | Canonical `BehaviourId` vocabulary, gaze cues, eyelid closures, mouth shapes |
| `lib/environmentConfig.ts` | `src/domain/environments/` | Display modes (`dark`, `warm`, `brown`), ambient surface and backlight configs |

## Future Synchronization Guidance
When updating Cloud or product definitions from a new branch in LCDPROTO:
1. Note the new source branch and SHA.
2. Update the corresponding modules in `src/domain/`.
3. Update this provenance log.
4. Verify using `npx tsc --noEmit` and `npm run lint`.
