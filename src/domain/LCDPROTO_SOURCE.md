# LCDPROTO Source of Truth Provenance

This document records the exact upstream LCDPROTO revisions consumed by `blob-mobile`.

## Runtime Vendor Source

- **Repository**: `Maxkhrys/LCDPROTO`
- **Branch**: `feat/cloud-physics-disney-defaults`
- **Commit SHA**: `a46067f44703f32b2f22e6e618b0eb54f71b147e`
- **Commit Date**: `2026-09-06`
- **Commit Subject**: `feat(cloud): adopt Disney physics pass and tuned production defaults`

This vendor snapshot includes Astra's completed Cloud physics / Disney-motion pass:
- 18/8 px/s activation hysteresis preventing erratic flutter on micro-movements
- Bounded acceleration anticipation (`lead()` filter with `tau = 0.08s`)
- 120Hz substeps for turn spring integration
- Separately delayed shell yaw/pitch (`0.105` and `0.13`) giving organic jelly follow-through
- Double wall deformation removed (delegating contact deformation purely to lobe target contact pressure)
- Directional reversal mist detection bug fixed (preserving `oldVx, oldVy`)
- Tuned canonical production defaults: character display scale 0.68x, internal cloud size 1.00, Purple Void palette (`#c4a5ff`, `#c59ffe`, `#ac90d5`, `#992fa7`), and canonical deformation parameters.

## Synchronized Modules & Architectures

| LCDPROTO Source | Mobile Domain Module | Notes |
| :--- | :--- | :--- |
| `components/experimental/cloud-blob/cloudLobeSystem.ts` | vendored runtime | Authored lobes, droplets, spring physics, 2.5D turn depth |
| `components/experimental/cloud-blob/cloudRenderer.ts` | vendored runtime | Volumetric alpha stamps, curved face projection, directional light, turning |
| `components/blob/faceRenderer.ts` | vendored runtime | Production black eyes, brows, procedural mouth |
| `lib/blobDrag.ts` / `lib/blobPhysics.ts` | vendored runtime | Direct drag, inertia, circular boundary collision and wall deformation |
| `lib/cloudPresets.ts` | `src/domain/palettes/` | Built-in Cloud presets and custom preset schema |
| `lib/characters.ts` | `src/domain/character/` | Cloud material, motion, mist and face-control definitions |
| `lib/deviceStates.ts` | `src/domain/productStates/` | Canonical product-state vocabulary plus mobile GOODBYE extension |
| `lib/stateEmotionMap.ts` | `src/domain/productStates/` | State expression/performance mapping |
| `lib/expressionCatalog.ts` | `src/domain/expressions/` | Canonical behaviour vocabulary |
| `lib/expressions/types.ts` | `src/domain/devlab/types.ts` | Expression Maker recipe shape |
| `lib/performances/corePerformances.ts` | runtime + `src/domain/devlab/catalog.ts` | Eight canonical core performance clips |
| `lib/performances/performanceRunner.ts` | vendored runtime | Deterministic performance playback |
| `lib/screenCatalogue.ts` | `src/domain/devlab/catalog.ts` | System-screen metadata and lifecycle flows |
| `lib/environmentConfig.ts` | `src/domain/environments/` | Canonical dark/warm/brown environment modes |

## Mobile Runtime Architecture

`vendor/lcdproto/manifest.json` pins exact upstream files. `scripts/build-runtime.cjs` compiles those files into the WebView/Canvas runtime. The mobile app does not own a second Cloud geometry or physics implementation.

Dev Lab extends this runtime through a typed live bridge. Controls update the already-running 466×466 runtime rather than reloading the WebView.

Current live bridge covers:

- material / lobe settings
- optical settings
- motion settings
- mist settings
- face placement
- yaw / pitch
- product state
- direct touch drag
- canonical behaviours
- canonical performance clips
- Expression Maker recipe override
- play / pause / reset / center / clear trails
- runtime telemetry

## Future Synchronization Rule

Do not assume `main` is current.

Before every sync:

1. Inspect recent LCDPROTO branches and commits.
2. Compare Cloud/runtime files, not branch names alone.
3. Record exact source branch and SHA.
4. Update `vendor/lcdproto/manifest.json` only when source files are actually re-vendored.
5. Run `npm run build:runtime` after vendor changes.
6. Run `npm run typecheck` and `npm run lint` before merge.

Do not overwrite newer branch-only Cloud work with an older `main` file just because `main` has a newer-looking production label.
