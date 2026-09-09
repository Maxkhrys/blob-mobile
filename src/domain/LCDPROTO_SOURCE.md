# LCDPROTO source-of-truth provenance

The mobile Cherri runtime is pinned to one coherent upstream revision:

- Repository: `Maxkhrys/LCDPROTO`
- Branch: `feat/grok-terra-orientation-synthesis-v1`
- Commit: `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`
- Subject: `feat(orientation): synthesise Terra 3D turning with Grok acting follow-through`

The previous mixed snapshot is not used. `vendor/lcdproto/manifest.json` records a SHA-256 for every copied source file, and `scripts/sync-lcdproto.py` refreshes only those manifest paths from the pinned commit.

## Runtime closure

The executable closure includes the canonical BehaviourController, Mind V4.5 director/catalogue, mouth and primitive systems, orientation synthesis, drag and jelly physics, rig/calibration, cloud lobe physics/renderer/mist, and environment/shadow helpers. The 60-second `DEMO_60S_ADORABILITY` story is authored inside CherriMind and is intentionally not counted in the 128-entry catalogue; the executable brain therefore exposes 129 stories.

Legacy `cloudPerformance.ts` and `performanceRunner.ts` remain in the immutable provenance snapshot, but the mobile host does not construct or call them. All stories, signatures, primitives, and acrobatics run through the same canonical `BehaviourController` path.

## Shared frame core

`src/components/character/cherriFrameCore.js` is the platform-neutral frame constructor used directly by Node parity tests and injected unchanged into the WebView runtime by `scripts/build-runtime.cjs`. It owns the drift-plus-controller jelly target, tactile contribution, physical radius and touch hit radius, calibrated rig, Cloud deformation parameters, and combined root/body velocity.

The renderer and React Native bridge stay platform-specific. The canonical browser React components are not copied into the app; their formulas are traced and asserted against the shared core in `scripts/check-stage-parity.cjs`. The detailed formula audit is in `docs/agent-status/cherri-frame-parity.md`.

Facing timing comes directly from `lib/mind/cloudFacing.ts`:

- eyes/face: immediate
- core: `0.048s`
- shell yaw/performance: `0.105s`; shell pitch: `0.13s`
- crown: `0.145s`
- heavy mass: `0.165s`

## Mobile adapter boundaries

`src/components/character/cloudCanvasRuntime.ts` owns only the WebView lifecycle, pointer/bridge events, drawing loop, mist pooling, scene composition, and telemetry. It instantiates the vendored controller, ambient, interaction sensor, drag, jelly, facing, lobe, and renderer modules. It does not own a second Mind, scheduler, gaze generator, signature approximation, or performance runner.

Cloud settings remain override buckets, matching LCDPROTO `DEFAULT_CLOUD_SETTINGS`. Empty settings do not materialise slider fallback values; this is important because web intentionally treats absent squash, stretch, and lean overrides as neutral.

`/motion-preview` is the single mobile-first developer Cherri Lab. `/dev-lab` is retained only as a route alias for existing links.
