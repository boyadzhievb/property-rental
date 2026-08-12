# Mobile App (Capacitor) — Implementation Plan

## Overview

Wrap the existing React web app in Capacitor to publish on Google Play Store (and optionally iOS App Store). The app code stays unchanged — Capacitor provides a native shell around the Vite build output.

## Prerequisites

- Google Play Developer account ($25 one-time)
- Android Studio installed locally
- For iOS: Mac with Xcode + Apple Developer account ($99/year)

## Steps

### 1. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Property Rental" "com.yourname.propertyrental"
```

### 2. Configure Capacitor

Create `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.propertyrental',
  appName: 'Property Rental',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### 3. Add Android platform

```bash
npm install @capacitor/android
npx cap add android
```

This creates the `android/` directory with the native project.

### 4. Add iOS platform (optional)

```bash
npm install @capacitor/ios
npx cap add ios
```

### 5. Add npm scripts to package.json

```json
{
  "scripts": {
    "cap:sync": "npm run build && npx cap sync",
    "cap:open:android": "npx cap open android",
    "cap:open:ios": "npx cap open ios"
  }
}
```

### 6. Build and deploy flow

```bash
npm run build          # Vite builds to dist/
npx cap sync          # Copies dist/ into native projects
npx cap open android  # Opens Android Studio
```

Then in Android Studio: Build > Generate Signed Bundle/APK.

### 7. Google Play Store requirements

- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Short description (80 chars) + full description (4000 chars)
- Privacy policy URL (hosted somewhere public)
- Target API level 34+ (Capacitor handles this)
- Content rating questionnaire (filled in Play Console)
- App signing: use Play App Signing (recommended)

### 8. iOS App Store requirements (if adding later)

- Mac with Xcode required for building
- Apple Developer account ($99/year)
- App icons at multiple resolutions (Xcode handles from 1024x1024 source)
- Privacy nutrition labels (declare data collection)
- App Store review (stricter than Google Play, allow 1-3 days)

## Branch strategy

Recommended: single `mobile` branch (or keep on `master`).

- Both `android/` and `ios/` folders coexist without conflict
- Same `npm run build` output serves web, Android, and iOS
- Merge `master` into mobile branch before each release to pick up latest features

## What stays unchanged

- All React components, services, contexts, hooks
- IndexedDB data layer
- Tailwind CSS styling
- Vite build config (`base: '/'` already correct for Capacitor)
- GitHub Pages deployment (unaffected by Capacitor files)

## Optional native enhancements (Capacitor plugins)

These are NOT required but available if needed later:

- `@capacitor/push-notifications` — notify owner of arrivals/payments
- `@capacitor/local-notifications` — task reminders
- `@capacitor/share` — share reports
- `@capacitor/filesystem` — export backups to device storage
- `@capacitor/camera` — photo documentation of room condition
