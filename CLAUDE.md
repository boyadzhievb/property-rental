@README.md
@HLD.md
@FLOWS.md
@AGENDA.md

## Quick Reference

- **Mobile builds**: `./scripts/build-mobile.sh [android|ios|all]` — bumps native versions, runs cap sync, produces AAB/archive
- **Release workflow**: use the `release` agent to run the full pipeline (pre-flight → bump → build → commit + tag)
