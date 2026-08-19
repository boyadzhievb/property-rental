#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

GRADLE_FILE="android/app/build.gradle"
CURRENT_VERSION_CODE=$(grep -o 'versionCode [0-9]*' "$GRADLE_FILE" | awk '{print $2}')
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

echo "==> Bumping versionCode: $CURRENT_VERSION_CODE -> $NEW_VERSION_CODE"
sed -i '' "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" "$GRADLE_FILE"

echo "==> Building web app..."
npm run build

echo "==> Syncing to Android..."
npx cap sync android

echo "==> Building release AAB..."
cd android
./gradlew bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  echo ""
  echo "Done! Build successful."
  echo "  AAB: $(pwd)/$AAB_PATH"
  echo "  versionCode: $NEW_VERSION_CODE"
  echo "  versionName: $(node -p "require('../package.json').version")"
else
  echo "Build failed - AAB not found"
  exit 1
fi

