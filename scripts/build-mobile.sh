#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

VERSION_NAME=$(node -p "require('./package.json').version")
GRADLE_FILE="$ROOT/android/app/build.gradle"
PBXPROJ_FILE="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
AAB_PATH="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
ARCHIVE_PATH="$ROOT/ios/App/build/App.xcarchive"

usage() {
  echo "Usage: $0 [android|ios|all]"
  echo "  android  — build Android AAB only"
  echo "  ios      — build iOS archive only"
  echo "  all      — build both (default)"
  echo ""
  echo "  The build number (Android versionCode, iOS CURRENT_PROJECT_VERSION) is bumped"
  echo "  automatically and kept the same on both platforms: the higher of the two + 1."
  exit 1
}

PLATFORM="${1:-all}"

case "$PLATFORM" in
  android|ios|all) ;;
  *) usage ;;
esac

# Version bumps must survive only a successful build: Gradle and Xcode read the new number from
# these files while building, so each file is backed up before its bump and restored if the
# script exits before that platform's build succeeded. A failed build never uses up a number.
BACKUP_DIR="$(mktemp -d)"

backup_before_bump() {
  cp "$1" "$BACKUP_DIR/$(basename "$1")"
}

keep_bump() {
  rm -f "$BACKUP_DIR/$(basename "$1")"
}

restore_unfinished_bumps() {
  local file backup
  for file in "$GRADLE_FILE" "$PBXPROJ_FILE"; do
    backup="$BACKUP_DIR/$(basename "$file")"
    if [ -f "$backup" ]; then
      cp "$backup" "$file"
      echo "==> Build did not finish: restored the version in ${file#"$ROOT"/}" >&2
    fi
  done
  rm -rf "$BACKUP_DIR"
}
trap restore_unfinished_bumps EXIT

current_android_code() {
  grep -o 'versionCode [0-9]*' "$GRADLE_FILE" | awk '{print $2}'
}

current_ios_code() {
  grep -o 'CURRENT_PROJECT_VERSION = [0-9]*' "$PBXPROJ_FILE" | head -1 | awk '{print $3}'
}

# One build number for both platforms, so they never drift apart: the higher of the two + 1.
ANDROID_CODE=$(current_android_code)
IOS_CODE=$(current_ios_code)
NEW_CODE=$(( (ANDROID_CODE > IOS_CODE ? ANDROID_CODE : IOS_CODE) + 1 ))

set_android_version() {
  backup_before_bump "$GRADLE_FILE"
  echo "==> Android versionCode: $ANDROID_CODE -> $NEW_CODE"
  sed -i '' "s/versionCode $ANDROID_CODE/versionCode $NEW_CODE/" "$GRADLE_FILE"
}

set_ios_version() {
  backup_before_bump "$PBXPROJ_FILE"
  echo "==> iOS CURRENT_PROJECT_VERSION: $IOS_CODE -> $NEW_CODE"
  sed -i '' "s/CURRENT_PROJECT_VERSION = $IOS_CODE/CURRENT_PROJECT_VERSION = $NEW_CODE/g" "$PBXPROJ_FILE"
  sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $VERSION_NAME/g" "$PBXPROJ_FILE"
}

build_web() {
  echo "==> Building web app..."
  npm run build
}

build_android() {
  set_android_version

  echo "==> Syncing to Android..."
  npx cap sync android

  echo "==> Building release AAB..."
  # An AAB left over from an earlier run must not pass for this build's output.
  rm -f "$AAB_PATH"
  (cd "$ROOT/android" && ./gradlew bundleRelease)

  if [ ! -f "$AAB_PATH" ]; then
    echo "Android build failed — AAB not found" >&2
    exit 1
  fi
  keep_bump "$GRADLE_FILE"
  echo ""
  echo "Android build successful."
  echo "  AAB: ${AAB_PATH#"$ROOT"/}"
  echo "  versionCode: $NEW_CODE"
  echo "  versionName: $VERSION_NAME"
}

build_ios() {
  set_ios_version

  echo "==> Syncing to iOS..."
  npx cap sync ios

  echo "==> Building iOS archive..."
  rm -rf "$ARCHIVE_PATH"
  (cd "$ROOT/ios/App" && xcodebuild -project App.xcodeproj \
    -scheme App \
    -configuration Release \
    -archivePath build/App.xcarchive \
    archive \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO)

  if [ ! -d "$ARCHIVE_PATH" ]; then
    echo "iOS build failed — archive not found" >&2
    exit 1
  fi
  keep_bump "$PBXPROJ_FILE"
  echo ""
  echo "iOS build successful."
  echo "  Archive: ${ARCHIVE_PATH#"$ROOT"/}"
  echo "  buildNumber: $NEW_CODE"
  echo "  versionName: $VERSION_NAME"
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
    # A successful Android build keeps its bump even if iOS fails afterwards: that AAB exists
    # with the new versionCode and may be uploaded.
    build_android
    echo ""
    build_ios
    ;;
esac

echo ""
echo "==> All done! versionName: $VERSION_NAME"
