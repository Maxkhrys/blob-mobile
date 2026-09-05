# CHERRIPI

Mobile companion for your Cherri. Expo SDK 57, React Native, TypeScript and a pinned LCDPROTO canvas runtime.

```sh
npm ci
npm run start
```

Open with a compatible Expo Go installation or development build. Services currently simulate device pairing, drivers and proximity. No BLE, GPS, backend or auth is active.

```sh
npm run lint
npm run typecheck
node scripts/check-runtime.cjs
npx expo export --platform all
```

[Implementation, source revisions and test status](CHERRIPI_V1.md).

The character sources are pinned to LCDPROTO `95dafb92b5ba87683294698bb7ea89729fd148d4`. With LCDPROTO cloned alongside this repository:

```sh
python scripts/sync-lcdproto.py
npm run build:runtime
node scripts/check-runtime.cjs
```

Do not edit generated character scripts or vendored source files by hand. Consumer controls use canonical IDs; geometry and physics tuning belong in LCDPROTO.
