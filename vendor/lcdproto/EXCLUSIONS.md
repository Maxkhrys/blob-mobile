# Deliberate exclusions from LCDPROTO 7d26f8b

Source: `Maxkhrys/LCDPROTO` `feat/grok-terra-orientation-synthesis-v1` at `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`.

Every path in `manifest.json` is byte-for-byte sourced from that commit. The following upstream areas are intentionally not vendored:

| Path | Reason |
| :--- | :--- |
| `components/playground/**` | Desktop Studio UI; the phone has a mobile-first Cherri Lab. |
| `components/device/**` | Next.js device chrome and desktop lab panels. |
| `components/screens/**` | Product-state React layer; mobile owns navigation and product screens. |
| `components/states/*` except `EnvironmentLayer.tsx` | React state views. `HomeState.tsx` remains the read-only formula reference and is stage-tested, not executed in React Native. |
| `components/blob/BlobCharacter.tsx` | Classic blob renderer; mobile uses the cloud renderer. |
| `components/blob/CloudCharacter.tsx` | Browser React/canvas host. Its platform-neutral frame formulas live in `cherriFrameCore.js` and are asserted against the pinned source. |
| `components/blob/downscale.ts` | Browser preview downscale helper. |
| `components/experimental/cloud-blob/CloudBlobTest.tsx` | Browser-only lab page. |
| `components/experimental/cloud-blob/CloudBlobControls.tsx` | Browser-only lab controls. |
| `components/experimental/cloud-blob/CloudBlobBody.tsx` | Browser-only body wrapper. |
| `components/experimental/cloud-blob/cloudLab.css` | Browser-only lab stylesheet. |
| `lib/uiThemes.ts` | Desktop Studio theme tokens. |
| `lib/deviceConfig.ts` | Browser simulator chrome configuration. |
| `lib/screenLifecycle.ts` | Browser screen lifecycle, not a character decision. |
| `lib/expressions/expressionBlend.ts` | Browser Expression Maker interpolation. Mobile developer face overrides layer onto the canonical pose without replacing its controller. |
| `lib/expressions/customStorage.ts` | Browser `localStorage`. |
| `lib/expressions/index.ts` | Re-export only. |
| `lib/performances/index.ts` | Re-export only. The legacy runner sources are retained for provenance but are not executed by mobile. |
| `lib/motionPreview.ts` | Does not exist upstream. The former mobile approximation was removed. |

The mobile-specific boundary is limited to `cloudCanvasRuntime.ts` (WebView lifecycle/input/render host), `cherriFrameCore.js` (formula-for-formula pure adapter), and React Native UI/bridge code.
