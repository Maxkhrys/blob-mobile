# LCDPROTO Source of Truth Provenance

This document records the exact upstream LCDPROTO revisions consumed by `blob-mobile`.

## Runtime Vendor Source

- **Repository**: `Maxkhrys/LCDPROTO`
- **Branch**: `tune/cherri-grab-squish-visible`
- **Commit SHA**: `a9ce979b5a60c2b3b8301ff7fe40b46106b6ce0a`
- **Commit Date**: `2026-09-07`
- **Commit Subject**: `tune(drag): boost tactile grab squish visibility and material response`

This vendor snapshot includes:
- **Cherri Mind V4**: Full autonomous acting system (`lib/mind/` [31 files] including director, planner, catalog, drives, mood state machine, spatial memory, and transitions) driven via `controller.update(dtMs, behaviourConfig, true)`.
- **Protected Facing Ownership**: Single-owner facing via `applyCloudFacing(facing, yaw, pitch, dt)`. The velocity-derived second heading layer is removed; the acted rig is the sole facing authority, with organic shell follow-through.
- **Tactile Grab Squish & Dent Physics**: Real local deformation under touch with contact vectoring (`grabPressure`, `contactDistance`, `contactAngle`, `normalCompression`, `tangentExpansion`, `faceShiftX`, `faceShiftY`), wall pressure resistance, and release snapback.
- **Interaction Sensing**: `InteractionSensor` converts raw touches, holds, drags, flicks, and wall collisions into structured `MindEvent` streams notifying Cherri Mind V4.
- **Volumetric Cloud Rendering & Mist**: 7-lobe procedural soft-body physics, billowy cumulus alpha stamps, mist wisps and trails.
- **Pinned Inventory**: 62 upstream source files tracked with SHA-256 integrity hashes in `vendor/lcdproto/manifest.json`.

## Synchronized Modules & Architectures

| LCDPROTO Source | Mobile Domain Module | Notes |
| :--- | :--- | :--- |
| `lib/mind/**` (31 files) | vendored runtime | Cherri Mind V4 autonomous director, story catalog, drives, planner, transitions |
| `lib/mind/cloudFacing.ts` | vendored runtime | Protected facing neutrality (`applyCloudFacing`), eliminating velocity drift |
| `lib/mind/eventSense.ts` | vendored runtime | `InteractionSensor` emitting pointer/drag/wall events to the Mind director |
| `lib/behaviours/controller.ts` | vendored runtime | Modern `BehaviourController` integrating Mind V4, primitives, and performances |
| `lib/behaviours/primitives.ts` | vendored runtime | Acted character primitive motions and poses |
| `components/experimental/cloud-blob/cloudLobeSystem.ts` | vendored runtime | Authored lobes, droplets, spring physics, 2.5D turn depth, tactile squish |
| `components/experimental/cloud-blob/cloudRenderer.ts` | vendored runtime | Volumetric alpha stamps, curved face projection, directional light, turning |
| `components/experimental/cloud-blob/cloudMistTrails.ts` | vendored runtime | Procedural mist trail physics |
| `components/blob/faceRenderer.ts` | vendored runtime | Production black eyes, brows, procedural mouth |
| `lib/blobDrag.ts` / `lib/blobPhysics.ts` | vendored runtime | Direct drag, tactile grab squish, inertia, circular boundary collision |
| `lib/cloudPresets.ts` | `src/domain/palettes/` | Built-in Cloud presets and custom preset schema |
| `lib/characters.ts` | `src/domain/character/` | Cloud material, motion, mist and face-control definitions |
| `lib/deviceStates.ts` | `src/domain/productStates/` | Canonical product-state vocabulary plus mobile GOODBYE extension |
| `lib/stateEmotionMap.ts` | `src/domain/productStates/` | State expression/performance mapping |
| `lib/expressionCatalog.ts` | `src/domain/expressions/` | Canonical behaviour vocabulary |
| `lib/expressions/types.ts` | `src/domain/devlab/types.ts` | Expression Maker recipe shape |
| `lib/performances/corePerformances.ts` | runtime + `src/domain/devlab/catalog.ts` | Canonical core performance clips |
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
