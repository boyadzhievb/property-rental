#!/usr/bin/env bash
# PostToolUse (Write|Edit): run the unit tests related to the edited file.
# Exit 2 feeds the failure back to Claude; the edit itself is already applied.
set -uo pipefail

file_path=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[[ "$file_path" =~ \.(ts|tsx|js|jsx)$ ]] || exit 0
[[ "$file_path" == "$CLAUDE_PROJECT_DIR"/src/* ]] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! output=$(npx vitest related --run --passWithNoTests "$file_path" 2>&1); then
  echo "Related unit tests failed after editing $file_path:" >&2
  echo "$output" | tail -40 >&2
  exit 2
fi
exit 0
