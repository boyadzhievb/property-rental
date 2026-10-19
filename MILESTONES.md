# Milestones — Code Health & Weakness Fixes

Audit date: 2026-10-19. Findings from architecture, security, data integrity, performance, and test coverage audits.

---

## MS1: Critical Security ⚡ (same day)

- [ ] `npm audit fix` for Capacitor Android CVE GHSA-rvm3-566m-v7fv (CVSS 9.3) — remote content can execute at app origin via internal HTTP proxy. Upgrade `@capacitor/android` to ≥8.5.1.
- [ ] Add Content Security Policy `<meta>` tag to `index.html` — lock down `default-src`, `script-src`, `connect-src`, `object-src 'none'`.
- [ ] Add security headers to `index.html` — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

## MS2: Data Integrity ⚡ (same day)

- [ ] Replace all `Date.now()` IDs with `crypto.randomUUID()` — prevents silent data overwrites on rapid taps or multi-tab use. Locations: `NewReservationModal.tsx:204,215`, `TodayView.tsx:135`, `CalendarView.tsx:84`, `GuestsView.tsx:119`, `AddRoomForm.tsx:20`, `Reservation.ts:125`.
- [ ] Fix floating-point currency arithmetic — wrap all money sums/comparisons with `Math.round(value * 100) / 100`. Locations: `PaymentService.ts:33-34`, `ReportsView.tsx:52,72,96`, `TodayView.tsx:59-62`, `CalendarView.tsx:114`.
- [ ] Fix seed data invariant — room 104 is `Occupied` but reservation `r2` is `Confirmed` (should be `Checked In`). File: `src/api/client.ts:71,88`.

## MS3: Date Handling (this week)

- [ ] Fix DST duration bug — `Reservation.ts:78` divides ms by 86400000 which gives 23/25h across DST. Replace with `date-fns/differenceInCalendarDays`.
- [ ] Fix timezone mismatch in date parsing — `new Date('YYYY-MM-DD')` parses as UTC midnight but `new Date()` is local time. Standardize by appending `T00:00:00` or using `date-fns/parseISO` consistently.

## MS4: Database Robustness (this week)

- [ ] Add versioned migration strategy in `src/api/client.ts:107-131` — sequential `if (oldVersion < N)` handlers inside `onupgradeneeded` to safely evolve schema across app updates.
- [ ] Add missing IndexedDB indexes — `guestId` and `seriesId` on the reservations store to eliminate full-table scans for guest history and recurring series queries.
- [ ] Make check-in/check-out atomic in `ReservationService.ts:113-150` — fetch room first, validate both domain transitions succeed, then write reservation + room in a single `batchPut()`.

## MS5: Referential Integrity (next sprint)

- [ ] Add `BroadcastChannel` sync — when one tab writes to IndexedDB, broadcast a refresh signal so other tabs update their in-memory context state. Prevents stale-state overwrites.
- [ ] Add cascade-delete logic — `deleteReservation()` must also delete associated payments and tasks. Guard future room/guest deletion similarly.

## MS6: Backup/Restore Completeness (next sprint)

- [ ] Include `localStorage` preferences in backup payload — locale, theme, and notification settings are currently lost on cross-device restore.
- [ ] Surface per-record import failures — log which specific records failed Zod validation and the reason, instead of only showing a skipped count.

## MS7: Performance (next sprint)

- [ ] Wrap large view components with `React.memo()` — `TodayView`, `CalendarView`, `GuestsView`, `NewReservationModal`. Estimated 30-50% fewer re-renders.
- [ ] Memoize render-path computations with `useMemo` — room filters in `TodayView:157-160`, payment reduces in `GuestsView:74-78`.
- [ ] Replace 14× `transition-all` with specific properties (`transition-[transform,opacity]`) — avoid layout thrashing on low-end devices. Files: `StatCard.tsx`, `CalendarView.tsx`, `TodayView.tsx`, `GuestsView.tsx`.
- [ ] Remove ineffective dynamic imports in `client.ts:207-211` — schemas are already statically imported elsewhere, so the code-split never happens.

## MS8: Type Safety (next sprint)

- [ ] Replace 46× `catch (e: any)` with `catch (e: unknown)` + `e instanceof Error ? e.message : 'Unknown error'` across all contexts and components.
- [ ] Fix repository type casts — align `src/api/client.ts` return types with domain model types so repositories don't need `as unknown as T` double-casts.

## MS9: Code Quality (ongoing)

- [ ] Extract `createEntityContext<T>(loadFn)` factory from the 5 near-identical entity context providers (~240 lines of duplication).
- [ ] Add `componentDidCatch(error, errorInfo)` to `ErrorBoundary.tsx` — currently errors are silently swallowed after catch.
- [ ] Skip task generation when linked room/guest is missing in `TodayView.tsx:47-50` — currently falls back to empty strings, producing tasks with blank names.
- [ ] Move `@capacitor/cli` from `dependencies` to `devDependencies` in `package.json` — it's build-time only.

## MS10: Test Coverage (ongoing)

- [ ] **BackupService** — unit tests for `validate()` (all 5 branches), `export()` round-trip, `import()` with corrupted data.
- [ ] **NotificationService** — unit tests for `deterministicBaseId()` (pure logic) and scheduling with mocked Capacitor.
- [ ] **Repository integration tests** — `GuestRepository`, `PaymentRepository`, `TaskRepository` against `fake-indexeddb`.
- [ ] **Hook tests** — `useCalendar`, `useReservation`, `useGuests`, `useRooms`, `usePayments`.
- [ ] **Shared test factory module** — extract `makeRoom()`, `makeGuest()`, `makeReservation()`, `makePayment()`, `makeTask()` into `src/test/factories.ts`.

## MS11: Final Validation (run after each milestone)

- [ ] Run full test suite — `npm test` + `npm run test:e2e` — zero failures.
- [ ] Run production build — `npm run build` — verify bundle output.
- [ ] Run `npm audit` — confirm zero critical/high vulnerabilities remaining.

---

## Progress Tracker

| Milestone | Tasks | Done | Status |
|-----------|-------|------|--------|
| MS1 Critical Security | 3 | 0 | Pending |
| MS2 Data Integrity | 3 | 0 | Pending |
| MS3 Date Handling | 2 | 0 | Pending |
| MS4 Database | 3 | 0 | Pending |
| MS5 Referential Integrity | 2 | 0 | Pending |
| MS6 Backup/Restore | 2 | 0 | Pending |
| MS7 Performance | 4 | 0 | Pending |
| MS8 Type Safety | 2 | 0 | Pending |
| MS9 Code Quality | 4 | 0 | Pending |
| MS10 Test Coverage | 5 | 0 | Pending |
| MS11 Final Validation | 3 | 0 | Pending |
| **Total** | **33** | **0** | |
