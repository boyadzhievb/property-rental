@HLD.md
@AGENDA.md

Before implementing or changing any state transition or multi-step action (check-in, check-out, cancel, payment, task completion), read `FLOWS.md`. User-facing overview lives in `README.md`; open work lives in `MILESTONES.md`.

## Rules

- **Layers:** UI → Context → Services → Repositories → IndexedDB (`src/api/client.ts`). Components and contexts never import repositories or `api/client`. Services never import components.
- **Domain enforces rules:** state transitions go through domain methods that throw on invalid moves (see `FLOWS.md`). Business logic (balances, conflicts, capacity) belongs in domain/services, not components.
- **Validation:** every write path goes through a Zod schema in `src/schemas/`.
- **Atomicity:** multi-entity writes (reservation + room, task + room, cascades) go in one IndexedDB transaction.
- **i18n:** never hardcode user-facing strings. Add every key to all 6 locales: en, bg, de, el, fr, es (`src/i18n/`).
- **Dates:** use date-fns. Dates are local `yyyy-MM-dd` strings; never `toISOString().split('T')[0]`.
- **TypeScript:** strict; no `any`, no `@ts-ignore` without a justifying comment.
- **Naming:** descriptive names, no abbreviations (`reservationService`, not `resSvc`).
- **Styling:** Tailwind only; inline styles only when Tailwind cannot express it.
- **Tests:** bug fixes start with a failing test. Run `npm test` and `npm run typecheck` before committing.
- **Commits:** no `Co-Authored-By` trailers.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 8443 (strict port) |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run build` | Production build to `dist/` |
| `./scripts/build-mobile.sh [android\|ios\|all]` | Bump native versions, cap sync, produce AAB/archive |

Release: use the `release` agent (pre-flight → bump → build → commit + tag). Never push or upload to stores without explicit approval.

## Gotchas

- Bundle IDs differ by platform and cannot change (both apps are published): Android `com.boyadboz.propertyrental`, iOS `com.boyadboz.property-rental`.
- `android/keystore.properties` and `*.jks` hold signing secrets — never read or print them.
