# Cherri mobile runtime — experimental motion preview

This branch is experimental. Do not merge to `main`.

## Repo / branch

- Repo: `Maxkhrys/blob-mobile`
- Branch: `feat/mobile-cherri-latest-motion-preview`
- Base branch: `feat/mobile-mind-v4-runtime-sync`
- Base SHA: `d927ed379d186f166d4d8710122e8246bfd62dca`
- LCDPROTO reference (read-only clone, not modified): `feat/grok-terra-orientation-synthesis-v1` @ `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`
- Vendor remainder still the mind-v4 snapshot (`tune/cherri-grab-squish-visible` @ `a9ce979b5a60c2b3b8301ff7fe40b46106b6ce0a`), plus an orientation subset copied from the reference SHA.

SHA after push is recorded by the agent that publishes this branch. This file does not invent a post-push SHA.

## Mobile architecture

Character is still a WebView HTML canvas. `src/components/character/cloudCanvasRuntime.ts` injects `canonicalRuntime.generated.ts` and `canonicalScene.generated.ts`, built from `vendor/lcdproto` by `scripts/build-runtime.cjs`.

No second character renderer was added. No Skia / React Native character views. No Studio UI. No browser-only developer tooling from LCDPROTO.

Character logic that was ported as pure TypeScript lives in:

- `vendor/lcdproto/lib/orientation.ts` — Facing × Performance, unwrapped yaw/pitch/roll, `lagAngle`, `settleTurnAngle`
- `vendor/lcdproto/lib/mind/cloudFacing.ts` — immediate eyes, delayed core → shell → crown → mass copies
- `vendor/lcdproto/lib/motionPreview.ts` — preview sequencer and acrobat / signature timing

Renderer-bound pieces vendored into the existing canvas runtime:

- `vendor/lcdproto/components/experimental/cloud-blob/cloudRenderer.ts` — Z-sorted lobes, curved face anchors, geometric back-face occlusion (`faceFront` cull), delayed layer matrices

A later shared module for both repos, named only here: `lib/orientation.ts` (and the motion player if LCDPROTO ever wants the same preview ids). Not extracted into a package.

## Character features ported

These are wired into the existing canvas runtime. Headless `node scripts/check-runtime.cjs` and `node scripts/check-motion-preview.cjs` completed without throwing and kept orientation numbers finite. That is not a phone visual pass. Treat the look as **unverified**.

| Feature | How it is wired | Status |
| --- | --- | --- |
| Current Cherri appearance | Existing cloud stamps + vendored orientation renderer | Unverified visually |
| Blink | Existing `BehaviourController` blink loop, left running | Unverified visually |
| Ambient float / breathing | Existing `AmbientDrift` + breath scale | Unverified visually |
| Gaze | Existing controller gaze, plus signature `LOOK_UP` / `LOOK_DOWN` offsets | Unverified visually |
| Eye → core → shell → mass follow-through | `applyCloudFacing` delayed copies | Unverified visually |
| Profile turning | Preview facing yaw ±90 (`PROFILE_YAW`), not the old ±45 clamp | Unverified visually |
| SPIN_360 | Performance yaw path copied from `BehaviourController.startAcrobat` / `updateAcrobat` | Unverified visually |
| BACKFLIP | Performance pitch, same acrobat timing | Unverified visually |
| FRONTFLIP | Performance pitch, same acrobat timing | Unverified visually |
| CARTWHEEL_LEFT / CARTWHEEL_RIGHT | Performance roll + small yaw, same acrobat timing | Unverified visually |
| Pancake | `SIG_PANCAKE` beat table from `lib/mind/catalogue/signature.ts` | Unverified visually |
| Proud puff | `SIG_GIANT_PROUD_PUFF` | Unverified visually |
| Tall stretch | `SIG_TALL_STRETCH` | Unverified visually |

### LCDPROTO action ids actually wired

- `NEUTRAL` — preview settle, not a catalogue story id
- `TURN_LEFT` / `TURN_RIGHT` — preview facing targets (±90). Not catalogue ids. Orientation lab equivalent is `setOrientationLab({ yaw, pitch })` in LCDPROTO; those method names are not used as button ids.
- `SPIN_360`
- `BACKFLIP`
- `FRONTFLIP`
- `CARTWHEEL_LEFT`
- `CARTWHEEL_RIGHT`
- `SIG_PANCAKE`
- `SIG_GIANT_PROUD_PUFF`
- `SIG_TALL_STRETCH`
- `PLAY_SHOWCASE` — preview sequencer only. It is not `ActingCycle` `"SHOWCASE"` and not `SHOWCASE_SEQUENCE` in `lib/mind/acting.ts`.

Acrobat timing (durations, wind-up, +360 unwrapped endpoints, `nearestEquivalentAngle` / `settleTurnAngle`) is copied from LCDPROTO `lib/behaviours/controller.ts`. Signature beat times and primitive amounts are copied from `lib/mind/catalogue/signature.ts` and `lib/behaviours/primitives.ts`.

The old vendor `startSpin()` 2D canvas spin is not called by the preview buttons.

## Features intentionally omitted

- Studio UI, orientation lab chrome, DeviceSimulator buttons
- Full signature catalogue (`SIG_BLEP_INNOCENT`, `SIG_RASPBERRY`, `SIG_DANCE_CAUGHT`, etc.)
- Mind director `SHOWCASE` cycle and `SHOWCASE_SEQUENCE` story playlist
- Autonomous CherriMind acting-cycle rewrite
- Replacing `BehaviourController` with the full LCDPROTO controller (it imports `./mouths` and other modules this vendor snapshot does not have)
- Drag-authored heading. Velocity still deforms lobes and mist; it does not author facing.
- Hardware blob / ESP32 port
- Merge of `feat/appetize-ios-preview`

## Motion Preview UI

Temporary developer screen: `src/app/motion-preview.tsx` (`/motion-preview`).

Linked from Settings (developer card) and the character tab. Simple triggers: neutral, turn left/right, 360, backflip, frontflip, cartwheel left/right, pancake, puff, stretch, PLAY SHOWCASE.

Aimed behaviours, **all unverified on a phone or simulator build**:

- face stays attached to the volume
- profile turns correctly
- no floating eyes
- no rear face (`faceFront` cull in the vendored renderer)
- 360 returns at an unwrapped full turn rather than a reverse snap
- consecutive actions do not rewind through the face (`settleTurnAngle` / nearest equivalent)
- flips settle
- mouth / eyes / orientation released when a signature beat ends (overrides are cleared with the acting state, not left on the controller)

## Metro root cause

Hypothesis confirmed from this tree, not by running a device:

- `eas.json` `development` still sets `developmentClient: true`. Those binaries boot looking for a Metro dev server.
- This branch has no `metro.config.js`.
- This branch does not depend on `expo-dev-client`.
- The character runtime is an embedded WebView HTML string, so a Metro-less binary is the correct preview shape.

The app was not switched onto the development profile. `expo-dev-client` was not added. A local Metro server is not required for the `ios-simulator` profile below.

## EAS profiles

`eas.json` `development` is unchanged (`developmentClient: true`).

Added profile `ios-simulator`, modeled on `feat/appetize-ios-preview` (read only; that branch was not merged or checked out onto this worktree):

- `developmentClient: false`
- `distribution: internal`
- `ios.simulator: true`

Also wired on this branch (not already present):

- `extra.eas.projectId`: `8355ffd6-6496-472b-a7e7-703f801d9f67`
- `ios.bundleIdentifier`: `com.maxkhrys.cherripi`

Slug remains `blob-mobile` (the appetize branch slug `fatbaps` was not copied).

## Build result

**No EAS build was run.** No artifact was produced. Do not treat this branch as a successful simulator build.

Exact command, when credentials and network are available:

```bash
eas build --platform ios --profile ios-simulator
```

Expected artifact: an `.app` inside the downloaded `.tar.gz` (iOS simulator build).

How to verify the JS bundle is embedded:

- The build profile has `developmentClient: false` and does not set a Metro URL.
- After download, the `.app` should launch in the Simulator without a running `expo start` / Metro process.
- In the unpacked `.app`, the Expo/Hermes bundle should be present under the app resources (not loaded from `localhost:8081`). If the app sits on a “waiting for Metro” / development-client connection screen, the wrong profile was used.

How to upload to Appetize:

1. Download the `ios-simulator` artifact.
2. Confirm it is a `.tar.gz` containing a `.app`.
3. Upload that archive (or the `.app`) in the Appetize dashboard as an iOS simulator build.
4. Open the public URL and navigate to Character Motion Preview.

## Appetize result

Not uploaded. No Appetize URL.

## Known issues

- Visual correctness of profile, flips, occlusion, and signature silhouettes is unverified. The headless checks only prove the canvas script runs and numbers stay finite.
- Signature mouth/eye overlays are a preview approximation of the story beats. They do not run the full Mind story player, so blink/mouth timing can disagree with LCDPROTO Studio.
- Pancake / puff scale is applied as pose deltas on top of the existing jelly clamps. Silhouette strength may be weaker than Studio.
- `canonicalScene.generated.ts` was regenerated by `scripts/build-runtime.cjs` with the local TypeScript 5.9 emit. Scene behaviour was not separately reviewed.
- No `eas build` credentials were exercised.

## Next action

1. Do not merge to `main`.
2. Run `eas build --platform ios --profile ios-simulator` from this branch.
3. Upload the `.tar.gz` / `.app` to Appetize and watch Motion Preview, especially profile, 360, both flips, both cartwheels, pancake, puff, stretch, then PLAY SHOWCASE twice without resetting.
4. Only after that, decide whether to fold `lib/orientation.ts` into a shared module.
