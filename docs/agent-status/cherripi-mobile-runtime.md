# CherriPi mobile runtime — full brain parity v1

Experimental. Do not merge to main. PR targets `feat/mobile-cherri-latest-motion-preview`.

1. **mobile starting branch/SHA**: `feat/mobile-cherri-latest-motion-preview` @ `70ae561f2135871b20a77715386af66703c12ae8`
2. **LCDPROTO source SHA**: `7d26f8ba6b8709d38b071115a025ba0dfeaefbee` (`feat/grok-terra-orientation-synthesis-v1`)
3. **new mobile branch**: `feat/mobile-cherri-full-brain-parity-v1`
4. **vendored files added/updated**: 67 files copied from that SHA into `vendor/lcdproto`. Added versus the old mixed snapshot: `lib/behaviours/mouths.ts`, `lib/mind/acting.ts`, `lib/mind/catalogue/signature.ts`, `lib/poseTruth.ts`. Every listed manifest file replaced from 7d26f8b.
5. **dependency closure**: Walked from `lib/behaviours/controller.ts` and `lib/mind/director.ts` through relative and `@/` imports. Closure is Mind + behaviours/mouths/primitives + blob physics/drag/rig + orientation/cloudFacing + cloud lobe/renderer/mist + faceRenderer. Studio UI and Next.js screens excluded; see `vendor/lcdproto/EXCLUSIONS.md`.
6. **old snapshot files removed/replaced**: Removed `lib/motionPreview.ts` (mobile approximation, not LCDPROTO). Replaced the `a9ce979` mind/controller/primitives/mouths-absent snapshot and the partial 7d26 orientation subset so the runtime is one source.
7. **story count web/mobile**: WEB_STORY_COUNT 129, MOBILE_STORY_COUNT 129, MISSING_ON_MOBILE [], EXTRA_ON_MOBILE []. Catalogue stories 128 plus director-authored `DEMO_60S_ADORABILITY`.
8. **primitive count web/mobile**: 27 / 27. Parameter diffs: none.
9. **signature count web/mobile**: 21 / 21. Missing: none.
10. **mouth count web/mobile**: 21 / 21 recipe IDs. Parameter diffs: none. Tongue channel is `mouthTongue` from `lib/behaviours/mouths.ts`.
11. **acting cycle parity**: NATURAL, CUTE, FUNNY, HYPER, SLEEPY, MISCHIEF, SHOWCASE. Match.
12. **intensity parity**: SUBTLE, NORMAL, EXPRESSIVE. Match.
13. **orientation parity**: Facing × Performance from vendored `orientation.ts` / `cloudFacing.ts`. Consecutive SPIN_360 produced performance yaw 360 then 720 (no wrap to 0). Back-face face-normal z: front 1, yaw 180 web -1, mobile -1. Follow-through after 16ms at 180°: eyes 180, core 51.0, shell 25.4, crown 18.8, mass 16.6. Source delays used, not re-hardcoded: core 0.048s, shell 0.105s, crown 0.145s, mass 0.165s.
14. **showcase parity**: `DEMO_60S_ADORABILITY` via `BehaviourController.playStory`. Duration 60000 ms. Web vs mobile pose samples at 0/7/13/20/28/34/42/48/56s: SHOWCASE_SAMPLE_DIFFS 0. Not a separate mobile sequencer.
15. **pose magnitude parity**: Primitive parameter JSON identical. Showcase sample at 48s FLATTEN bodyScaleX 0.6292 / bodyScaleY -0.3862 on both. Acting scale mapping copies web CloudCharacter clamps; grab 0.38 smear only while grabbed or on a wall.
16. **autonomous runtime result**: NATURAL + EXPRESSIVE, seed `0xc4e881`, 120s, 50ms steps. Web and mobile story sequences matched (58 story-id transitions). This is headless `BehaviourController` output, not a device visual run.
17. **touch result**: Headless `notify(GRAB_START)` interrupted `SIG_PANCAKE`; recent events included GRAB_START then RELEASE; later autonomous story `HAPPY_TINY_HOP`. Canvas host still feeds `InteractionSensor` + `BlobDragController` (radial dent, corner blend, flick, dragFaceYaw). Visual touch on device unverified.
18. **FPS/performance**: Unverified on device/WebView. Headless parity harness completed; no FPS, memory, or bundle-size measurement on a simulator. Generated runtime bundle is present (`canonicalRuntime.generated.ts`). Do not treat that as a frame-time result.
19. **parity tests**: `node scripts/check-cherri-parity.cjs` PASS. Report: `docs/agent-status/cherri-parity-report.json`.
20. **typecheck/tests**: `npx tsc --noEmit` PASS. `node scripts/check-motion-preview.cjs` PASS (host no longer constructs `MotionPreviewPlayer`; acrobat/showcase commands stay finite under a mocked canvas). Not a visual/WebView observation.
21. **EAS simulator build**: Not run. `ios-simulator` profile remains `developmentClient: false`, `ios.simulator: true`. No token prompted.
22. **Metro-free launch result**: Not produced. Unverified. User preview locally with Metro from `C:\Users\AORUS\.gemini\antigravity\scratch\blob-mobile`:
    ```
    cd C:\Users\AORUS\.gemini\antigravity\scratch\blob-mobile
    git checkout feat/mobile-cherri-full-brain-parity-v1
    git pull
    npx expo start --clear
    ```
23. **known differences**:
    - `DEMO_60S_ADORABILITY` lives in `CherriMind` (`director.ts`), not `STORY_BY_ID`. Counted in brain story totals on both sides.
    - Mobile canvas host is still a platform adapter. It does not execute `CloudCharacter.tsx`. Pose mapping copies the web HomeState/CloudCharacter clamps documented in `src/domain/LCDPROTO_SOURCE.md`.
    - Scene shadow extraction binds `composeOrientation` / `rotateVec3` from the vendored LCD bundle because the sliced `EnvironmentLayer` helpers do not include their imports.
    - Developer route remains `/motion-preview` (Cherri Brain Lab). TURN_LEFT / TURN_RIGHT / NEUTRAL call `setOrientationLab` as a developer facing scrub, not a second scheduler.
    - Visual/WebView/device parity unverified. Behavioural controller output matched the 7d26 source in the headless harness.
    - Studio UI, Next.js screens, and browser localStorage expression storage excluded on purpose.
24. **final pushed SHA**: implementation `23117afc4c4ec8b2f0546c69885c2693a0b9df33`; status record commit `a67fd8d822494aa30092d097d30285fa2d72d161`. Branch tip is the PR head.
