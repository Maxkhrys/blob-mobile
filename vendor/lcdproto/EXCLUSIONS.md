# Deliberately excluded from the 7d26f8b vendor snapshot

Source: Maxkhrys/LCDPROTO `feat/grok-terra-orientation-synthesis-v1` @ `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`.

Every file listed in `manifest.json` is copied from that one SHA. Character runtime (Mind, behaviours, mouths, primitives, orientation, physics, drag, cloud lobe/render) is not mixed with the previous `a9ce979` snapshot.

## Excluded source files

| Path | Why |
| :--- | :--- |
| `components/playground/**` | Studio UI. Not required to execute CherriMind. |
| `components/device/**` | Next.js device chrome / lab panels. |
| `components/screens/**` | System screen React layer. Mobile has its own navigation. |
| `components/states/*` except `EnvironmentLayer.tsx` | Product-state React views. Mobile host already drives BehaviourController directly. |
| `components/blob/BlobCharacter.tsx` | Classic blob renderer. Mobile uses the cloud canvas renderer. |
| `components/blob/CloudCharacter.tsx` | React host. Pose mapping is mirrored in `cloudCanvasRuntime.ts`; the component itself is not executed. |
| `components/blob/downscale.ts` | Preview downscale helper, not character decisions. |
| `components/experimental/cloud-blob/CloudBlobTest.tsx` | Lab page. |
| `components/experimental/cloud-blob/CloudBlobControls.tsx` | Lab controls. |
| `components/experimental/cloud-blob/CloudBlobBody.tsx` | Lab body wrapper. |
| `components/experimental/cloud-blob/cloudLab.css` | Lab stylesheet. |
| `lib/uiThemes.ts` | Studio theme tokens. |
| `lib/deviceConfig.ts` | Simulator device chrome config. |
| `lib/screenLifecycle.ts` | System-screen lifecycle, not the character brain. |
| `lib/expressions/expressionBlend.ts` | Expression Maker blending. Mobile Expression Maker still uses vendored `coreExpressions` + `types`. |
| `lib/expressions/customStorage.ts` | Browser localStorage. Not available, and not a character decision. |
| `lib/expressions/index.ts` | Re-export only. |
| `lib/performances/index.ts` | Re-export only. `performanceRunner.ts` is vendored and loaded directly. |
| `lib/motionPreview.ts` | Did not exist in LCDPROTO. Removed from mobile. It was an approximate sequencer. |

## Mobile adapter notes

- `src/components/character/cloudCanvasRuntime.ts` is a platform host. It instantiates the vendored `BehaviourController`, feeds touch through `InteractionSensor` / `BlobDragController`, and translates the canonical pose into the existing canvas renderer.
- Facing follow-through delays are the source constants in `lib/mind/cloudFacing.ts`: eyes immediate, core 0.048s, shell 0.105s, crown 0.145s, mass 0.165s.
- Renderer safety clamps match web `CloudCharacter` / `HomeState` (body scale 0.72–1.55 / 0.70–1.60, jelly deform ±0.10, body deform ±0.34, grab smear 0.38 only while grabbed or on a wall). They are not a second behaviour system.
- `DEMO_60S_ADORABILITY` is authored inside `CherriMind` (`lib/mind/director.ts`), not the story catalogue map. Mobile plays it through `BehaviourController.playStory` / `playAdorabilityDemo`.
