# CHERRIPI Android Development Build

Primary test device: Samsung Galaxy S22.

This branch is intended to run as an Expo development build, not as an Expo Go-only workflow.

## Source

- Mobile branch: `feat/cherripi-mobile-devlab`
- Mobile base SHA: `2594f282a4d5193befffce6c54b68aa7fcbd0739`
- LCDPROTO runtime source: `feat/cloud-menu-ui-accents`
- LCDPROTO runtime SHA: `95dafb92b5ba87683294698bb7ea89729fd148d4`
- LCDPROTO main reference at implementation time: `bd2460fbc78c1d1e6dfe9cac4b362ddd887df6c3`

## One-time PC setup

On Windows, install Android Studio with Android SDK / platform tools and a compatible JDK. Enable Developer options and USB debugging on Galaxy S22.

Verify phone is visible:

```cmd
adb devices
```

Accept USB-debugging prompt on phone if it appears.

## First development-build install

From `blob-mobile`:

```cmd
git fetch origin
git switch feat/cherripi-mobile-devlab
git pull --ff-only
npm install
npx expo install expo-dev-client
npm run build:runtime
adb devices
npx expo run:android --device
```

`npx expo install expo-dev-client` is intentionally the install step for SDK-compatible `expo-dev-client`. It updates `package.json` and lockfile together on developer machine instead of this branch carrying a hand-edited / inconsistent lockfile.

Choose Galaxy S22 when Expo asks for device.

Once native development client is installed, normal JavaScript / TypeScript / vendored-runtime work does not require reinstalling APK unless native dependencies or native config change.

## Normal daily run

USB or same Wi-Fi network:

```cmd
git switch feat/cherripi-mobile-devlab
git pull --ff-only
npm run build:runtime
npx expo start --dev-client --lan
```

Open CHERRIPI development client on Galaxy S22 and connect to Metro session.

## Stable USB-only fallback

If LAN discovery is flaky:

```cmd
adb reverse tcp:8081 tcp:8081
npm run build:runtime
npx expo start --dev-client --localhost
```

Keep phone connected by USB.

## EAS APK alternative

Repo includes `eas.json` development profile.

After installing `expo-dev-client` dependency:

```cmd
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
```

Install generated development APK on Galaxy S22. Then start Metro with:

```cmd
npm run build:runtime
npx expo start --dev-client --lan
```

## Dev Lab

In app:

`Settings` → `Developer` → `Open Dev Lab`

Use pinned live Cherri display to test:

- direct touch drag
- circular wall squish
- inertia / settle
- material and lobe controls
- physics / motion controls
- mist controls
- face placement
- Expression Maker recipes
- expression / behaviour catalogue
- core performances
- product states
- lifecycle screen catalogue
- playback controls
- live runtime telemetry

## Runtime sync rule

If files inside `vendor/lcdproto/` change, always rebuild generated runtime before launching:

```cmd
npm run build:runtime
```

Do not replace vendored Cloud files from `main` without comparing recent LCDPROTO branches first.
