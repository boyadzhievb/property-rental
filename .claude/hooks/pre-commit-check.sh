#!/usr/bin/env bash
# PreToolUse (Bash): block `git commit` unless typecheck, lint and unit tests pass.
set -uo pipefail

command=$(jq -r '.tool_input.command // empty')
[[ "$command" =~ (^|[[:space:];&|])git[[:space:]]+commit ]] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! output=$(npm run --silent typecheck 2>&1); then
  echo "Commit blocked: typecheck failed." >&2
  echo "$output" | tail -30 >&2
  exit 2
fi
if ! output=$(npm run --silent lint 2>&1); then
  echo "Commit blocked: lint failed." >&2
  echo "$output" | tail -30 >&2
  exit 2
fi
if ! output=$(npm test --silent 2>&1); then
  echo "Commit blocked: unit tests failed." >&2
  echo "$output" | tail -40 >&2
  exit 2
fi
exit 0
