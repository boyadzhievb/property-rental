#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION_NAME=$(node -p "require('./package.json').version")
GRADLE_FILE="android/app/build.gradle"
PBXPROJ_FILE="ios/App/App.xcodeproj/project.pbxproj"

usage() {
  echo "Usage: $0 [android|ios|all]"
  echo "  android  — build Android AAB only"
  echo "  ios      — build iOS archive only"
  echo "  all      — build both (default)"
  exit 1
}

PLATFORM="${1:-all}"

case "$PLATFORM" in
  android|ios|all) ;;
  *) usage ;;
esac

bump_android_version() {
  local current_code
  current_code=$(grep -o 'versionCode [0-9]*' "$GRADLE_FILE" | awk '{print $2}')
  local new_code=$((current_code + 1))
  echo "==> Bumping Android versionCode: $current_code -> $new_code"
  sed -i '' "s/versionCode $current_code/versionCode $new_code/" "$GRADLE_FILE"
  echo "$new_code"
}

bump_ios_version() {
  local current_code
  current_code=$(grep -o 'CURRENT_PROJECT_VERSION = [0-9]*' "$PBXPROJ_FILE" | head -1 | awk '{print $3}')
  local new_code=$((current_code + 1))
  echo "==> Bumping iOS CURRENT_PROJECT_VERSION: $current_code -> $new_code"
  sed -i '' "s/CURRENT_PROJECT_VERSION = $current_code/CURRENT_PROJECT_VERSION = $new_code/g" "$PBXPROJ_FILE"
  sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $VERSION_NAME/g" "$PBXPROJ_FILE"
  echo "$new_code"
}

build_web() {
  echo "==> Building web app..."
  npm run build
}

build_android() {
  local version_code
  version_code=$(bump_android_version)

  echo "==> Syncing to Android..."
  npx cap sync android

  echo "==> Building release AAB..."
  cd android
  ./gradlew bundleRelease
  cd ..

  local aab_path="android/app/build/outputs/bundle/release/app-release.aab"
  if [ -f "$aab_path" ]; then
    echo ""
    echo "Android build successful."
    echo "  AAB: $aab_path"
    echo "  versionCode: $version_code"
    echo "  versionName: $VERSION_NAME"
  else
    echo "Android build failed — AAB not found"
    exit 1
  fi
}

build_ios() {
  local version_code
  version_code=$(bump_ios_version)

  echo "==> Syncing to iOS..."
  npx cap sync ios

  echo "==> Building iOS archive..."
  cd ios/App
  xcodebuild -project App.xcodeproj \
    -scheme App \
    -configuration Release \
    -archivePath build/App.xcarchive \
    archive \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO
  cd ../..

  local archive_path="ios/App/build/App.xcarchive"
  if [ -d "$archive_path" ]; then
    echo ""
    echo "iOS build successful."
    echo "  Archive: $archive_path"
    echo "  buildNumber: $version_code"
    echo "  versionName: $VERSION_NAME"
  else
    echo "iOS build failed — archive not found"
    exit 1
  fi
}

build_web

case "$PLATFORM" in
  android)
    build_android
    ;;
  ios)
    build_ios
    ;;
  all)
    build_android
    echo ""
    build_ios
    ;;
esac

echo ""
echo "==> All done! versionName: $VERSION_NAME"
