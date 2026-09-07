# Appetize iOS preview

## Build

From `blob-mobile`, run:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile ios-simulator
```

The login command is needed once if EAS is not already authenticated. Sign in to Expo account `fatbaps` when prompted.

Use the EAS build page to download the completed simulator artifact. It is a `.tar.gz` or `.zip` containing an iOS Simulator `.app` bundle. This profile is a standalone release-style build; it does not use Expo Go, `expo-dev-client`, or Metro.

## Upload to Appetize

Sign in to Appetize, upload the downloaded archive, select an iPhone simulator, and launch it. Appetize account access may be required. Replace the uploaded build after future mobile changes by creating a new EAS build and uploading its new archive.
