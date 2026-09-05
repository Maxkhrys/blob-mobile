# LCDPROTO Source of Truth Provenance

This document records the exact upstream LCDPROTO revisions consumed by `blob-mobile`.

## Runtime Vendor Source

- **Repository**: `Maxkhrys/LCDPROTO`
- **Branch**: `feat/cloud-menu-ui-accents`
- **Commit SHA**: `95dafb92b5ba87683294698bb7ea89729fd148d4`
- **Commit Date**: `2026-09-05 14:04:20 +0100`
- **Commit Subject**: `feat(mobile): make simulator and controls fully mobile responsive`

This is the correct runtime source for the mobile Cloud. It is not merely a UI-only branch. Its history contains:

- `ddc29e6269074c2b9ac1957b488a5be09020471d` — eyes lead turn, curved face projection, 2.5D lobe depth, core-driven shadow
- `dfe2ec07a291fdc0c1a05d715df8113c0e712aaa` — shadow floor-gap fix, sticker-squash removal, turn/emote layering
- `95dafb92b5ba87683294698bb7ea89729fd148d4` — mobile-responsive simulator/control work

LCDPROTO `main` at the Dev Lab implementation point was:

- **Branch**: `main`
- **Commit SHA**: `bd2460fbc78c1d1e6dfe9cac4b362ddd887df6c3`
- **Commit Subject**: `feat(cloud): fix shadow floor gap, eliminate sticker squash, and layer 3D turn with emotes`

The runtime vendor branch is richer than this main revision for Cloud turning because it carries the production fix plus the later curved-face / 2.5D turn work on its own branch history.

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
