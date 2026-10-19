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
