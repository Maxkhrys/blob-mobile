# Cherri frame-pipeline parity audit

Reference: LCDPROTO `feat/grok-terra-orientation-synthesis-v1` at `7d26f8ba6b8709d38b071115a025ba0dfeaefbee`. Mobile baseline: `feat/mobile-cherri-full-brain-parity-v1` at `452258b10965bb6c664ae6cefb4f00fb9a2f8683`.

| Channel | Canonical web formula/path | Previous mobile path | v2 result | Visual consequence |
| :--- | :--- | :--- | :--- | :--- |
| Touch begin | `drag.begin(...)` on pointer down | Began only after movement threshold | Begin immediately; threshold now classifies tap vs drag only | Stationary tap/hold enters Tactile V5 compression and local dent. |
| Touch hit radius | `max(size*.32, size*.535*1.05*visualScale)` | One smaller `hitRadius*.84` also used for collision | Separate generous hit radius and exact physical collision radius | Organic edge puffs accept finger contact without moving walls inward. |
| Physical radius | `92*blobScaleNow*characterScale*cloudScale` | Derived from a 180px hit body and extra softness/puff factors | Exact web formula | Wall contact begins at the same silhouette boundary. |
| Interaction coordinates | Contact relative to the 466-space centre | Absolute canvas coordinates | Centred contact coordinates | Tap travel, hold, flick, and event direction classify correctly. |
| Interaction state | Sensor reads raw pointer contact for Cloud | Sensor read `dragPose.grabbed` and drag offsets | Sensor reads independent contact state | Sub-frame taps and stationary holds reach Mind. |
| Jelly X/Y | authored `clamp(dsx,±.55)` + tactile `clamp(±.10)` | Combined contribution clamped to `±.10` | Shared core uses the two-stage web formula | Pancake/stretch amplitude is no longer erased. |
| Body X/Y scale | authored `clamp(±.50)` + tactile `clamp(±.34)` | Combined contribution clamped to `±.34` | Shared core uses the two-stage web formula | Body mass keeps full authored silhouette while touch remains bounded. |
| Cloud acting | Body clamps `0.72–1.55` / `0.70–1.60`; tactile smear `.38` only during grab/wall | Acting and tactile deformation were damped together | Same acting weight, authored silhouette, and conditional smear | Puff, pancake, tall stretch, pea shrink, and landings read at web magnitude. |
| Cloud defaults | Empty override buckets; absent squash/stretch/lean are neutral | Slider fallback defaults were eagerly applied; runtime also materialised `DEFAULT_DEFORMATION` | Empty `params` overrides through app and WebView | Cherri is no longer permanently pre-squashed, stretched, leaned, and puffed. |
| Rig velocity | `(blob.x+body.x, blob.y+body.y)` | Root `physical.x/y` only | Combined calibrated rig offsets | Hops, giggles, landings, and drag drive full lobe follow-through. |
| Ambient placement | Renderer adds `sin(t*.45)*driftAmount`, `sin(t*.8)*floatAmount` | Ambient was scaled through a different mobile-only path | Exact CloudCharacter offsets | Autonomous float has the same cadence and spatial energy. |
| First frame | Velocity is zero when previous frame is null | Null check happened after assigning the time | Check before assignment | No false first-frame velocity/acceleration spike. |
| Face sockets | `x/y` carry gaze; sockets remain calibrated anchors | Gaze copied into both `x/y` and `socketX/Y` | Shared rig leaves sockets neutral before calibration | Eyes no longer double-shift inside the face. |
| Face placement | Renderer receives `cloudFace` once | Host manually altered position/socket/scale before render | Pass `face` to canonical renderer | Face offset and scale follow one canonical transform. |
| Facing ownership | Acted rig owns unwrapped facing/performance; layers lag via `applyCloudFacing` | Extra legacy performance overlay could author a second motion path | Only `BehaviourController` and `applyCloudFacing` | Turns and acrobatics keep continuous orientation and correct occlusion. |
| Lobe lag | Base config; `×1.18` grabbed, `×1.12` after flick | Missing per-frame multipliers | Exact web multipliers | Grip and flick travel visibly through the mass. |
| Mist release | Dynamic energy gets a `+1.8` release burst | Constant `0.18` dragging energy | Exact release, velocity, acceleration, and turn energy | Flick/release shedding matches the web trail response. |
| Mist placement | Final Cloud scale and `params.x/y` | Raw setting scale and root-only placement | Final deformation inputs | Wisps stay attached to the visible body during scaling and body lag. |
| Renderer contract | `face`, `safeRadius=size/2-170*scale`, `showContactShadow=false` | Manual face, different radius, duplicate shadow default | Exact renderer inputs | Face, clipping, and official environment shadow agree with web. |
| Runtime ownership | Controller owns stories and acrobatics | Controller plus legacy `PerformanceRunner` | Legacy runner removed from host | Autonomous and manual actions cannot fight each other. |
| Dynamic settings | Browser reconstructs defaults plus current overrides | `Object.assign` accumulated removed values | Rebuild params/motion/trails/face on every update | Reset and preset changes take effect without recreating the WebView. |

## Config-update audit

The WebView HTML is created once. `window.updateCloudProps` updates palette, cloud overrides, character scale, driver yaw/pitch, pupils, interaction, telemetry, parity trace, physics debug, Reduced Motion, state, expression recipe, presentation, screen colour, and display mode. Behaviour, reaction token, and emotion changes retrigger the canonical controller. Auto Mind, mood, acting cycle, intensity, manual stories/signatures/primitives, orientation, face overrides, and touch tests use explicit runtime commands.

The 466-space runtime `size` intentionally stays fixed because LCDPROTO authors all body/face/physics geometry in that coordinate system. The React Native `size` prop changes only the hardware/WebView viewport, matching the web `viewportSize` contract.

## Automated evidence

`npm run check:stage-parity` executes web and mobile modules through the shared frame core and deep-compares controller, jelly target, physics, rig, Cloud, and lobe state. It covers neutral, tap, hold, drag, flick, wall, 19 representative stories/signatures, five acrobatics, the nine required 60-second showcase marks, and a deterministic 120-second Natural/Expressive run. Compact metrics are written to `cherri-stage-parity-report.json`.
