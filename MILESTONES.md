# Milestones — Code Health & Weakness Fixes

Audit date: 2026-10-19. Findings from architecture, security, data integrity, performance, and test coverage audits.

---

## MS1: Critical Security ⚡ (same day)

- [x] `npm audit fix` for Capacitor Android CVE GHSA-rvm3-566m-v7fv (CVSS 9.3) — remote content can execute at app origin via internal HTTP proxy. Upgrade `@capacitor/android` to ≥8.5.1.
- [x] Add Content Security Policy `<meta>` tag to `index.html` — lock down `default-src`, `script-src`, `connect-src`, `object-src 'none'`.
- [x] Add security headers to `index.html` — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

## MS2: Data Integrity ⚡ (same day)

- [x] Replace all `Date.now()` IDs with `crypto.randomUUID()` — prevents silent data overwrites on rapid taps or multi-tab use. Locations: `NewReservationModal.tsx:204,215`, `TodayView.tsx:135`, `CalendarView.tsx:84`, `GuestsView.tsx:119`, `AddRoomForm.tsx:20`, `Reservation.ts:125`.
- [x] Fix floating-point currency arithmetic — wrap all money sums/comparisons with `Math.round(value * 100) / 100`. Locations: `PaymentService.ts:33-34`, `ReportsView.tsx:52,72,96`, `TodayView.tsx:59-62`, `CalendarView.tsx:114`.
- [x] Fix seed data invariant — room 104 is `Occupied` but reservation `r2` is `Confirmed` (should be `Checked In`). File: `src/api/client.ts:71,88`.

## MS3: Date Handling (this week)

- [x] Fix DST duration bug — `Reservation.ts:78` divides ms by 86400000 which gives 23/25h across DST. Replace with `date-fns/differenceInCalendarDays`.
- [x] Fix timezone mismatch in date parsing — `new Date('YYYY-MM-DD')` parses as UTC midnight but `new Date()` is local time. Standardize by appending `T00:00:00` or using `date-fns/parseISO` consistently.

## MS4: Database Robustness (this week)

- [x] Add versioned migration strategy in `src/api/client.ts:107-131` — sequential `if (oldVersion < N)` handlers inside `onupgradeneeded` to safely evolve schema across app updates.
- [x] Add missing IndexedDB indexes — `guestId` and `seriesId` on the reservations store to eliminate full-table scans for guest history and recurring series queries.
- [x] Make check-in/check-out atomic in `ReservationService.ts:113-150` — fetch room first, validate both domain transitions succeed, then write reservation + room in a single `batchPut()`.

## MS5: Referential Integrity (next sprint)

- [x] Add `BroadcastChannel` sync — when one tab writes to IndexedDB, broadcast a refresh signal so other tabs update their in-memory context state. Prevents stale-state overwrites.
- [x] Add cascade-delete logic — `deleteReservation()` must also delete associated payments and tasks. Guard future room/guest deletion similarly.

## MS6: Backup/Restore Completeness (next sprint)

- [x] Include `localStorage` preferences in backup payload — locale, theme, and notification settings are currently lost on cross-device restore.
- [x] Surface per-record import failures — log which specific records failed Zod validation and the reason, instead of only showing a skipped count.

## MS7: Performance (next sprint)

- [x] Wrap `TodayView` with `React.memo()` and memoize filter operations with `useMemo`.
- [x] Wrap remaining view components with `React.memo()` — `CalendarView`, `GuestsView`, `NewReservationModal`.
- [x] Replace 13× `transition-all` with specific properties (`transition-[transform,opacity]`) — avoid layout thrashing on low-end devices. Files: `StatCard.tsx`, `CalendarView.tsx`, `TodayView.tsx`, `Timeline.tsx`, `GuestsView.tsx`.
- [x] Remove ineffective dynamic imports in `client.ts` — replaced with static imports since schemas are already bundled via services.

## MS8: Type Safety (next sprint)

- [x] Replace 13× `catch (e: any)` with `catch (e: unknown)` + `e instanceof Error ? e.message : 'Unknown error'` across all contexts, hooks, and components.
- [x] Fix repository type casts — replaced `as unknown as` and `as any` in RoomRepository with explicit conversion function.

## MS9: Code Quality (ongoing)

- [x] Extract `createEntityContext<T>(loadFn)` factory from the 5 near-identical entity context providers (251 → ~80 lines).
- [x] Add `componentDidCatch(error, errorInfo)` to `ErrorBoundary.tsx` — logs error and component stack to console.
- [x] Skip task generation when linked room/guest is missing in `TodayView.tsx` — filter out entries with missing references.
- [x] Move `@capacitor/cli` from `dependencies` to `devDependencies` in `package.json` — it's build-time only.

## MS10: Test Coverage (ongoing)

- [x] **BackupService** — unit tests for `validate()` (all branches), `export()` delegation, `import()` delegation.
- [x] **NotificationService** — unit tests for enable/disable, scheduling, and mocked Capacitor.
- [x] **Repository integration tests** — `GuestRepository`, `PaymentRepository`, `TaskRepository` against `fake-indexeddb`.
- [x] **Service getter coverage** — added tests for all uncovered getAll/getById/deleteReservation methods.
- [x] **Hook tests** — `useCalendar` (5 tests), `useReservation` (7 tests).
- [x] **Shared test factory module** — `makeRoom()`, `makeGuest()`, `makeReservation()`, `makePayment()`, `makeTask()` in `src/test/factories.ts`.

## MS11: Final Validation (run after each milestone)

- [x] Run full test suite — `npm test` — 275 tests, zero failures.
- [x] Run production build — `npm run build` — verified bundle output (401ms).
- [x] Run `npm audit --omit=dev` — zero vulnerabilities in production dependencies.

---

## Progress Tracker

| Milestone | Tasks | Done | Status |
|-----------|-------|------|--------|
| MS1 Critical Security | 3 | 3 | ✅ Complete |
| MS2 Data Integrity | 3 | 3 | ✅ Complete |
| MS3 Date Handling | 2 | 2 | ✅ Complete |
| MS4 Database | 3 | 3 | ✅ Complete |
| MS5 Referential Integrity | 2 | 2 | ✅ Complete |
| MS6 Backup/Restore | 2 | 2 | ✅ Complete |
| MS7 Performance | 4 | 4 | ✅ Complete |
| MS8 Type Safety | 2 | 2 | ✅ Complete |
| MS9 Code Quality | 4 | 4 | ✅ Complete |
| MS10 Test Coverage | 6 | 6 | ✅ Complete |
| MS11 Final Validation | 3 | 3 | ✅ Complete |
| **Total** | **34** | **34** | ✅ 100% complete |

---

# Milestones — Architecture Review (Round 2)

Audit date: 2026-11-03. Architecture review of the code and LLM infrastructure (`CLAUDE.md`, `.claude/`). Baseline at audit time: typecheck clean, 371/371 unit tests passing, 0 production vulnerabilities, i18n keys in sync across 6 locales.

Open items from the 2026-09-22 review (`chat-22sep.md`) that are still unresolved are folded into MS14–MS15.

---

## Phase 0 — LLM Infrastructure & Repo Hygiene (≈1 day, low risk)

### MS12: Claude Code Infrastructure

- [x] Remove misleading `HLD*`/`FLOWS*` rules from `.gitignore` — both files were already tracked (the rule only affects untracked files), so the original "not available to clones" finding was wrong; the rule was still a trap for renamed/new docs.
- [x] Rewrite `CLAUDE.md` as concise rules — move mandatory conventions (no `any`, long names, i18n in all locales, date-fns, Tailwind only, layer boundaries, no Co-Authored-By) out of `lead-developer.md` into `CLAUDE.md`. Drop the eager `@README.md` import; point to `FLOWS.md` as "read before changing transitions".
- [x] Fix stale docs — 6 locales not 5 (`es` exists) in README, HLD, `i18n-audit`, `code-reviewer`, `lead-developer`; TypeScript 7 not 5.7; README app ID; HLD says Capacitor "planned" (shipped).
- [x] Hooks: replace hardcoded `/Users/boyadboz/...` with `$CLAUDE_PROJECT_DIR` in `.claude/settings.json` and all 13 agents.
- [x] Hooks: convert the commit check from `PostToolUse` to a blocking `PreToolUse` on `git commit` (exit 2 on failure). Currently it runs after the commit, and `tsc | tail` + `|| true` masks failures.
- [x] Hooks: replace full-suite run on every Write/Edit with `vitest related <file>` and surface failures (exit 2) instead of `|| true`. Commit matching moved into the script, so the `if:` field is no longer needed. Scripts: `.claude/hooks/post-edit-tests.sh`, `.claude/hooks/pre-commit-check.sh`.
- [x] Add `permissions.deny` — `Read(android/keystore.properties)`, `Read(**/*.jks)`, `Read(**/*.keystore)`, `Bash(git push --force*)`; `git push` moved to `ask`.
- [x] Restrict read-only agents — `a11y`, `data-integrity`, `track-architecture` now Read/Grep/Glob only. `code-reviewer`, `deploy`, `i18n-audit`, `performance`, `project-manager`, `security-privacy`, `test-website` still need Bash (npm/git), so for them "never write code" remains prompt-enforced.
- [x] `code-reviewer.md` — `git diff main...HEAD` → `master...HEAD`.
- [x] `i18n-audit.md` — add `es` to the locale loop; extend the unused-key scan to `src/services/` and `src/context/`.
- [x] `test-website.md` — remove the stale "ignore Property.test.ts:68 TS error" note (typecheck is clean); start/stop the dev server in a single command (`npm run dev &` + `kill %1` across separate shells orphans the server on strict port 8443).
- [x] `track-architecture.md` — include `src/context/` in the layer-boundary greps (misses `PropertyContext` → `api/client`).
- [x] `release.md` — replace `git add -A` with explicit paths; align commit format with history (`Release vX.Y.Z — …`); add CHANGELOG step.
- [x] Consolidate overlapping agents — `project-manager` now defers version checks to `track-versioning`. Decision (2026-11-04): keep `code-reviewer` and `security-privacy` alongside the built-in `/code-review` / `/security-review`, since they carry repo-specific rules.

### MS13: Repo Hygiene

- [x] Gitignore `coverage/`, `test-results/`, `chat-*.md`, `.vscode/`; remove tracked `chat-22sep.md` and `test-results/.last-run.json`.
- [x] `.gitattributes` declares Git LFS for images, but LFS is not in use (files are raw blobs) — remove the LFS rules or migrate properly.
- [x] Remove duplicate `screenshots/` (also in `public/screenshots/`) if not needed for store listings.
  - Done 2026-11-04: it is the output of `e2e/visual-sweep.spec.ts`, so it is now gitignored and untracked (files stay on disk) instead of deleted.
- [x] Commit or revert the dangling `versionCode`/`CURRENT_PROJECT_VERSION` bumps in `android/app/build.gradle` and `project.pbxproj`. — reverted 2026-11-04 (back to 26; the next release bumps it).

---

## Phase 1 — Data Safety (P0)

### MS14: Backup, Storage & Privacy

- [x] **Import wipes all data** — `importBackup()` clears all stores then writes only valid records (`client.ts:262-283`). A file containing only `{"settings":{}}` passes `BackupService.validate()` (`BackupService.ts:41`) and erases everything. Add: confirmation dialog, automatic pre-import backup (as reset already does), refuse when import would empty non-empty stores, all-or-nothing option when records are skipped.
  - Done 2026-11-04: `BackupService.analyze()` + guarded `import()` throw `BackupImportError` (`wouldEraseData` when the backup has no rooms/guests/reservations but the DB does; `invalidRecords` unless `allowPartial`). Settings restore shows a current → backup count comparison incl. skipped records, saves a `property-backup-before-restore-*` file, and aborts if that fails. Regression tests: `src/test/backupImport.test.ts`.
- [x] Add `schemaVersion` to the backup format; validate `payments`/`tasks` are arrays; validate `settings` and `preferences` (locale/theme are written to localStorage unchecked).
- [x] Persist parsed Zod output instead of raw input in import (unknown fields are currently stored).
  - Done 2026-11-04: `src/schemas/BackupSchema.ts` (`BACKUP_SCHEMA_VERSION = 1`; legacy files without it = v1; newer versions rejected). All five record arrays checked; settings reduced to `name`; invalid preference values dropped. Per-record parsing moved from `client.ts` into `BackupService`, which hands only parsed records to `importBackup()`.
- [x] Referential checks on import — reservations → rooms/guests, payments → reservations.
  - Done 2026-11-04: also tasks → linked room/reservation/guest. Orphans are reported as skipped records (`References missing room "…"`), so they fall under the same refuse-unless-`allowPartial` rule and the restore confirmation count.
- [x] Call `navigator.storage.persist()` on startup — IndexedDB is evictable (Safari especially) for PWA users.
  - Done 2026-11-04: requested once on first DB open in `getDB()`; best effort, failures ignored. Firefox may show a one-time permission prompt.
- [x] Add `onblocked` / `onversionchange` handlers in `openDB()` (`client.ts:93`) so upgrades don't hang with another tab open.
  - Done 2026-11-04: on `versionchange` the old tab closes its connection and reloads; `onblocked` logs a warning while waiting. Tests: `src/test/openDatabase.test.ts`.
- [x] **Privacy claim mismatch** — `android:allowBackup="true"` (`AndroidManifest.xml:4`) uploads guest PII to Google Drive; iOS backs up the app container to iCloud. Either disable (`allowBackup=false` + `dataExtractionRules`, iOS exclude-from-backup) or update README, privacy policy, and Play Data Safety form.
  - Done 2026-11-04 (decision: disable): `allowBackup="false"` + `res/xml/data_extraction_rules.xml` (cloud backup and device transfer excluded); iOS `AppDelegate.excludeWebDataFromBackup()` marks `Library/WebKit` as excluded. README, privacy policy (Nov 4 2026) and HLD state that Export Backup is the only copy.

### MS15: Transactional Integrity

- [x] `atomicReadWrite()` must call `transaction.abort()` when the callback throws (`client.ts:461-473`) — partial `put()`s currently commit.
- [x] Move reservation create (conflict check + save) into a single transaction — double-tap / two tabs can double-book (`ReservationService.ts:59-69`).
- [x] Move `checkIn` / `checkOut` / `cancel` / `cancelSeries` reads inside the write transaction (stale-read overwrite risk).
- [x] Make `deleteReservation()` cascade atomic (`ReservationService.ts:201`).
- [x] Make `toggleTask()` room transition + task save atomic (`TaskService.ts:23-39`).
- [x] `api.*.update()` on a missing ID silently writes a partial record (`client.ts:497`) — throw instead; do read+write in one transaction.
- [x] Repositories detect "not found" via a caught TypeError from `new Room(undefined)` and swallow real DB errors (`RoomRepository.ts:14-20`, Guest, Reservation). Check `data == null` explicitly, let other errors propagate (as `PaymentRepository` does).
- [x] `batchPut()` — add `onabort` handler so the promise can't hang.
  - Done 2026-11-04: all multi-entity service writes now run through `atomicReadWrite()`. Concurrency regression tests (fake IndexedDB, no mocks): `src/test/serviceAtomicity.test.ts`; mock-based service tests use `src/test/fakeAtomicReadWrite.ts`. `batchPut()` has no remaining callers.

---

## Phase 2 — Correctness (P1)

Each fix starts with a failing test.

### MS16: Domain & Scheduling Bugs

- [ ] Monthly recurrence drift — `setMonth(+1)` turns Jan 31 into Mar 3 (`Reservation.ts:156`). Use `addMonths` from the original anchor date.
- [ ] Weekly/biweekly series with stay longer than the interval overlaps itself → double booking (`ReservationService.ts:96`). Reject or check occurrences against each other.
- [ ] Cap the number of generated occurrences (e.g. 104) and series end date.
- [ ] Notification time bug — when the slot has passed, `setMinutes(now.getMinutes() + 1)` is applied to the 08:00 date, still in the past (`NotificationService.ts:71`, also lines 86, 101, 115). Use `now + 1 min`.
- [ ] Reschedule notifications when today's data changes — the once-per-day localStorage flag suppresses later arrivals; clean up old `notifications-scheduled-*` keys.
- [ ] Check-in proceeds silently when the room is missing (`ReservationService.ts:122`) — throw `Room not found`.
- [ ] Validate date format `yyyy-MM-dd` (regex) in Reservation, Payment, Task schemas — overlap logic depends on lexical comparison.
- [ ] Add a payment amount upper bound and 2-decimal precision in `PaymentSchema`.

### MS17: Error Handling & i18n Leaks

- [ ] Completing a cleaning task throws if the room is no longer in Cleaning (`TaskService.ts:33`) — guard the transition; `handleToggleTask` and the auto-task effect have no `catch` (`TodayView.tsx:93-104`).
- [ ] Render Payment and Task context errors in `ErrorMessages` (`App.tsx:35`).
- [ ] Auto-task titles are persisted in English (`TaskService.ts:61,76,91`) — store type + params, translate at render time.
- [ ] Hardcoded `$` currency (`CalendarView.tsx:261-286`, `PaymentService.ts:36`, others) — add a currency setting and format with `Intl.NumberFormat`.
- [ ] Hardcoded English strings — `window.confirm` in `PropertyContext.tsx:98`, "Loading..." (`App.tsx:79`), "Skip to content" (`App.tsx:115`), `Error: ${result.error}` (`SettingsView.tsx:110`), `CalendarRow.tsx:57` aria-label.
- [ ] Domain/service errors shown raw in UI — throw typed error codes and translate in the UI.

---

## Phase 3 — Architecture

### MS18: Structure & Enforcement

- [ ] Single source of truth for types — derive from Zod (`z.infer`); remove duplicate interfaces in `client.ts` and `domain/*Data`.
- [ ] Split `src/api/client.ts` (536 lines) into `db.ts` (open/migrations), `seed.ts`, `backup.ts`, `crud.ts`.
- [ ] Remove the `PropertyContext` → `api/client` layer violation — route through a `PropertyService` / `BackupService`.
- [ ] Decide the context pattern: contexts expose actions (per HLD) vs components calling services directly (current practice in `TodayView`, etc.). Implement one, update `HLD.md`.
- [ ] Move balance/paid calculations out of components (`TodayView.tsx:57`, `CalendarView`, `ReportsView`) into domain/`PaymentService`.
- [ ] Store money as integer cents (DB migration v6) to remove float rounding patches.
- [ ] Add ESLint with `eslint-plugin-react-hooks` (would have caught the v1.1.24/25 production hooks crash) and an import-boundary rule (`eslint-plugin-boundaries` or dependency-cruiser) to enforce layering in CI instead of grep-based agents.
- [ ] Targeted cross-tab refresh — broadcast which store changed instead of refreshing all 5 contexts on every write.

---

## Phase 4 — CI, PWA & Mobile

### MS19: CI/CD

- [ ] Deploy workflow must depend on CI passing; add `npm run typecheck` to deploy.
- [ ] Restore an E2E smoke job in CI (Chromium, critical flows) — removed in `51ab0c4`.
- [ ] Pin GitHub Actions by commit SHA; pin `aquasecurity/trivy-action` to a release (currently `@master`) and decide whether HIGH/CRITICAL should fail (`exit-code: 0`).
- [ ] Raise `npm audit` level from `critical` to `high`.

### MS20: PWA & Mobile Build

- [ ] Service worker (`public/sw.js`): `/assets/` check never matches under the `/property-rental/` base; non-OK responses are cached; static `CACHE_NAME` never invalidates (unbounded growth, stale `index.html`); hashed bundles not precached. Migrate to `vite-plugin-pwa` (Workbox) with a generated precache manifest.
- [ ] Manifest icons — `../icons/` resolves outside scope on GitHub Pages; `.webp` files contain PNG data; `index.html` links a non-existent `icons/icon.svg`.
- [ ] Document the bundle-ID mismatch — Android `com.boyadboz.propertyrental` vs iOS/`capacitor.config.ts` `com.boyadboz.property-rental` (cannot change post-publish).
- [ ] `scripts/build-mobile.sh` — bump versions only after a successful build; stop `echo` output polluting the captured version code.

### MS21: Final Validation (run after each milestone)

- [ ] `npm run typecheck` — clean.
- [ ] `npm test` — zero failures, new regression tests included.
- [ ] `npm run test:e2e` — zero failures.
- [ ] `npm run build` and `npm audit --omit=dev` — clean.

---

## Progress Tracker — Round 2

| Phase | Milestone | Tasks | Done | Status |
|-------|-----------|-------|------|--------|
| 0 | MS12 Claude Code Infrastructure | 14 | 14 | ✅ Complete |
| 0 | MS13 Repo Hygiene | 4 | 4 | ✅ Complete |
| 1 | MS14 Backup, Storage & Privacy | 7 | 7 | ✅ Complete |
| 1 | MS15 Transactional Integrity | 8 | 8 | ✅ Complete |
| 2 | MS16 Domain & Scheduling Bugs | 8 | 0 | ⬜ Not started |
| 2 | MS17 Error Handling & i18n Leaks | 6 | 0 | ⬜ Not started |
| 3 | MS18 Structure & Enforcement | 8 | 0 | ⬜ Not started |
| 4 | MS19 CI/CD | 4 | 0 | ⬜ Not started |
| 4 | MS20 PWA & Mobile Build | 4 | 0 | ⬜ Not started |
| — | MS21 Final Validation | 4 | 0 | ⬜ Not started |
| | **Total** | **67** | **33** | 🟨 49% complete |
