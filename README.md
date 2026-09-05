# Blob Mobile

Companion mobile application for the **LCD DISPLAY / Cloud companion** automotive hardware device.

---

## ☁️ Character Fidelity & LCDPROTO Provenance

This application contains the authentic Cloud character runtime synchronized directly from canonical laboratory work in [`Maxkhrys/LCDPROTO`](https://github.com/Maxkhrys/LCDPROTO) (branch: `feat/cloud-menu-ui-accents`, commit: `95dafb92b5ba87683294698bb7ea89729fd148d4`).

### Canonical Character Architecture (`src/domain/character/`)
Unlike early toy prototypes with flat SVG circles and white eye catchlights, the mobile runtime implements the genuine volumetric Cloud companion:
- **8 Primary Character Lobes**: `topCrown`, `leftShoulder`, `rightShoulder`, `leftCheek`, `rightCheek`, `bottomBelly`, `core`, `frontVeil`.
- **6 Secondary Billow Sub-Puffs**: Atmospheric multi-phase breathing displacement.
- **Directional Volumetric Lighting Stamps**: 10 dynamic alpha stamps (`mass`, `rearMass`, `crevice`, `crestRim`, `underside`, `core`, `mist`, `smoke`, `glow`, `shadow`) rasterized with angle parallax and world-anchored follow.
- **3D Heading & Turn System**: Yaw (-45°..+45°) and pitch (-30°..+30°) turning with 2nd-order damped spring physics, eye-leading anticipation (`gazeLead`), and 2.5D projected-Z lobe depth sorting.
- **Production Face Renderer**:
  - Spherical 3D projection onto a virtual curved volume.
  - Solid black procedural eyes with analytic aperture bands and lid bias.
  - Procedural brows with strict geometric clearance rules.
  - Dynamic mouth with crescent smile morph and depth shading.
  - Optional developer gaze catchlight (`showPupils`).

### Controlled Mobile WebView Runtime (`src/components/character/`)
- Powered by `react-native-webview` running on the device's hardware-accelerated Chrome engine.
- 60fps continuous animation with zero frame drops or React re-render stutter.
- Interactive touch-drag with organic jelly spring physics, inertial wake displacement, and trailing mist wisps.
- Non-reloading typed JavaScript bridge for instant parameter updates (palettes, yaw/pitch, expressions).

---

## 🚦 Product Domain & Proximity States (`src/domain/productStates/`)

The mobile companion synchronizes with the canonical 9 product states defined in LCDPROTO:

| Product State | Intimacy | Body Lean | Depth Bias | Canonical Emotion / Performance | Temporary Palette Override |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`HOME`** | 0.00 | 0.00 | 0.00 | `REST` (Neutral Standby) | *Selected Base Palette* |
| **`SENSED`** | 0.20 | +0.08 | +0.05 | `CURIOUS_TILT_RIGHT` | *Sensed Cool Mist Tint* |
| **`APPROACHING`** | 0.45 | +0.18 | +0.12 | `LOOK_UP` / `FRIENDLY` | Cool Mist (Aqua/Teal) |
| **`VERY_CLOSE`** | 0.75 | +0.28 | +0.22 | `HAPPY_WIGGLE` / `EXCITED` | Baby Blue |
| **`TOGETHER`** | 0.95 | +0.35 | +0.28 | `LAUGH_SQUISH` / `HAPPY` | Blush Rose (Warm Coral) |
| **`SYNC`** | 0.90 | +0.20 | +0.18 | `NOD_TWICE` / `ATTENTIVE` | Emerald Vapor (Mint) |
| **`CONNECTED`** | 1.00 | +0.10 | +0.15 | `WARM_GLOW` / `CONTENT` | Golden Dawn (Warm Amber) |
| **`RECOGNIZED`** | 0.85 | +0.25 | +0.20 | `BOUNCE_HIGH` / `DELIGHTED` | Purple Void (Lavender) |
| **`GOODBYE`** | 0.15 | -0.15 | -0.10 | `SAD_DROOP` / `FAREWELL` | Cool Mist Fade |

---

## 🎨 Canonical Palettes & Environments

- **Cloud Colour Presets**: Cloud White, Cloud Blue, Cool Mist, Purple Void, Emerald Vapor, Blush Rose, Golden Dawn.
- **Display Environments**:
  - **Zen / Sand**: Calm sand and warm stone ambience.
  - **Dark (OLED)**: Pure black stealth contrast for vehicle AMOLED displays.
  - **Sky**: Airy daylight atmosphere with horizon blue tones.
  - **Warm Glow**: Golden dusk cabin warmth and ember tones.

---

## 📱 Testing on Samsung Galaxy S22 (Expo Go)

This project runs cleanly in **Expo Go** with zero native build or compilation steps:

### Prerequisites
1. Install **Expo Go** from Google Play Store on your Samsung Galaxy S22.
2. Ensure your phone and development computer are on the same Wi-Fi network (or use `--tunnel`).

### Booting the Application
```bash
# 1. Install dependencies
npm install

# 2. Start the Expo development server with cache cleared
npx expo start -c
```

### Opening on Galaxy S22
1. Open the **Expo Go** app on your Samsung Galaxy S22.
2. Tap **"Scan QR code"** and point your camera at the QR code displayed in the terminal.
3. The app will bundle Metro assets and launch directly on your device.

---

## 🧪 Verification & Quality Checks

```bash
# Type check with TypeScript compiler
npx tsc --noEmit

# Lint code
npm run lint

# Verify Android production bundle
npx expo export --platform android
```
