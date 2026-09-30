## Code review — `boyadzhievb/property-rental`

I reviewed the current `master` branch at commit `7e9e67b56e1288faa9461e48e7e18bb68e84dbf8` (September 22, 2026).

The project has a good foundation: the React/context → service → repository → IndexedDB layering is clear, Zod validation is used at important boundaries, and there is a substantial unit + Playwright test suite. The main issues I found are around **data integrity, date handling, and state transitions** rather than overall structure.

### Findings

| Priority   | Area                  | Finding                                                              |
| ---------- | --------------------- | -------------------------------------------------------------------- |
| High       | Calendar              | Week/month boundary bug can hide reservations                        |
| High       | Reservations          | Invalid status transitions are allowed                               |
| High       | Data integrity        | Reservation/payment writes are not atomic                            |
| High       | Backup/restore        | Restore can silently discard data and leave stale UI                 |
| Medium     | Notifications         | Disable/re-enable can suppress notifications for the rest of the day |
| Medium     | Dates/time zones      | UTC/local date handling is inconsistent                              |
| Medium     | Referential integrity | Reservations can be saved with nonexistent rooms/guests              |
| Medium     | CI                    | Tests exist but are not executed by the deployment workflow          |
| Low/Medium | IndexedDB             | Connection/migration handling needs more robustness                  |

### 1. Calendar can show an incomplete week

**Files:** `src/components/calendar/CalendarView.tsx`, `src/hooks/useCalendar.ts`, `src/services/ReservationService.ts`

The UI is explicitly a **7-day week**:

```ts
const days = useMemo(
  () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
  [weekStart],
)
```

But `useCalendar()` calls:

```ts
reservationService.getReservations(month)
```

and `ReservationService.getReservations()` queries the **entire calendar month**, not the visible week:

```ts
const from = format(startOfMonth(month), 'yyyy-MM-dd')
const to = format(endOfMonth(month), 'yyyy-MM-dd')
return reservationRepository.getByMonth(from, to)
```

This produces two problems:

* A week crossing a month boundary can omit reservations in the second month.
* Because the database filter uses:

```ts
r.departureDate > from && r.arrivalDate < to
```

a reservation whose arrival is exactly on the final day of the month is excluded.

For example, a week containing September 28 → October 4 will only load September data when `weekStart` is September 28.

**Fix:** make the calendar query use the visible week, preferably a half-open interval:

```ts
[from, nextWeekStart)
```

and filter with:

```ts
departureDate > from && arrivalDate < nextWeekStart
```

That also makes the boundary semantics much easier to reason about.

---

### 2. Reservation state transitions are not actually enforced

**File:** `src/domain/Reservation.ts`

`Reservation` exposes:

```ts
cancel()
checkIn()
checkOut()
```

but each method simply assigns a new status.

That means all of these are currently possible:

* cancelled → checked in
* checked-out → checked in
* confirmed → checked out
* checked-out → cancelled

The service layer does not prevent those transitions either.

This is particularly dangerous because `ReservationService.checkIn()` then also calls:

```ts
room.occupy()
```

and `checkOut()` marks the room as cleaning.

So an invalid reservation transition can also corrupt room state.

The existing tests cover the happy path but don't test illegal transitions.

**Fix:** make the reservation domain object enforce a transition matrix, for example:

```text
Confirmed   -> Checked In | Cancelled
Checked In  -> Checked Out | Cancelled
Checked Out -> terminal
Cancelled   -> terminal
```

Then add tests for every rejected transition.

---

### 3. Reservation and payment checks are race-prone

**Files:** `src/services/ReservationService.ts`, `src/services/PaymentService.ts`

Reservation creation does:

1. read all reservations
2. check for conflicts
3. save reservation

Payment creation does:

1. read current payments
2. calculate total
3. validate remaining balance
4. save payment

Those are separate IndexedDB transactions.

Two tabs can therefore do this:

```text
Tab A: sees €500 paid
Tab B: sees €500 paid

A: adds €400
B: adds €400

Result: €1300 total paid
```

Similarly, two tabs can both see a room as available and create overlapping reservations.

This isn't just a theoretical optimization issue; the application is explicitly designed around local persistent data, so multiple browser tabs are a realistic scenario.

**Fix:** move the read/check/write into a single IndexedDB `readwrite` transaction, or introduce a serialized write path. Do the same for payments.

---

### 4. Recurring reservations can be partially written

**File:** `src/services/ReservationService.ts`

`createRecurringSeries()` validates the entire series first, but then persists each occurrence individually:

```ts
for (const occurrence of occurrences) {
  await reservationRepository.save(new Reservation(occurrence))
}
```

If occurrence 1 and 2 succeed and occurrence 3 fails, the database contains a **partial series**.

There is no rollback.

**Fix:** persist the complete series in one IndexedDB transaction. This is another place where a repository-level batch operation would pay off.

---

### 5. Backup restore can silently destroy or corrupt data

**Files:** `src/api/client.ts`, `src/components/settings/SettingsView.tsx`

This is the most concerning restore-path issue.

`importBackup()` does:

```ts
const validReservations =
  (data.reservations ?? []).filter(r => ReservationSchema.safeParse(r).success)
```

So invalid records are silently discarded.

Then it immediately clears the existing database:

```ts
tx.objectStore('rooms').clear()
tx.objectStore('guests').clear()
tx.objectStore('reservations').clear()
tx.objectStore('payments').clear()
tx.objectStore('tasks').clear()
```

There is also no referential-integrity validation. A backup can contain:

```text
reservation.roomId -> missing room
reservation.guestId -> missing guest
payment.reservationId -> missing reservation
```

and still be imported.

That means an import can report success while producing incomplete data.

There is a second UI issue: `SettingsView` refreshes rooms, guests, and reservations after restore, but **doesn't refresh payments or tasks**. Those contexts can therefore continue displaying the old in-memory data after the database has been replaced.

**Fix:**

1. Validate the entire backup before modifying anything.
2. Fail the import if any record is invalid rather than filtering it out.
3. Validate cross-entity references and duplicate IDs.
4. Perform replacement atomically.
5. Refresh all affected contexts, including payments/tasks/property settings.

---

### 6. Notification disable/re-enable has a same-day bug

**File:** `src/services/NotificationService.ts`

Scheduling uses:

```ts
const scheduledKey = `notifications-scheduled-${today}`
if (localStorage.getItem(scheduledKey)) return
```

When notifications are disabled, the code cancels pending notifications, but it does **not remove that key**.

So:

```text
09:00  notifications scheduled
11:00  user disables notifications
11:05  user re-enables notifications
```

The re-enable path sees the existing `notifications-scheduled-YYYY-MM-DD` key and schedules nothing for the rest of that day.

There is another behavioral issue: when the app is opened after the intended notification time, all missed reminders are moved to roughly `now + 1 minute`. So arrival, departure, cleaning, and payment reminders can all collapse together.

**Fix:** clear/rebuild today's schedule when notification state changes, and use stable notification identities rather than only a daily boolean marker.

---

### 7. Date handling mixes local dates and UTC dates

There are several inconsistent approaches.

For example `TodayView` creates task dates with:

```ts
new Date().toISOString().split('T')[0]
```

and `CalendarView` does the same for payment dates.

Elsewhere the code correctly uses local-calendar semantics:

```ts
format(new Date(), 'yyyy-MM-dd')
```

Those can disagree around midnight depending on timezone.

There is also risky mixing of:

```ts
new Date('2025-06-01')
```

with local `getFullYear()`, `getMonth()`, `getDate()` in recurring reservation generation.

For a property-management application, date-only values such as check-in/check-out should not drift because of the user's timezone.

**Fix:** establish one date-only convention throughout the app. `date-fns` with explicit parsing/formatting is a reasonable choice. Avoid converting date-only values through `toISOString()` unless UTC semantics are explicitly intended.

---

### 8. Reservation creation doesn't require the referenced entities to exist

**File:** `src/services/ReservationService.ts`

Capacity validation is conditional:

```ts
const room = await roomRepository.getById(reservation.roomId)

if (room && reservation.guestsCount > room.maxGuests) {
  ...
}
```

If the room does not exist, the reservation is still saved.

The guest isn't checked at all.

The schema only verifies that the IDs are non-empty strings; it doesn't establish that they point to actual entities.

This is another route to inconsistent data, especially after imports or programmatic use of the service layer.

**Fix:**

```ts
const room = await roomRepository.getById(...)
if (!room) throw new Error('Room not found')

const guest = await guestRepository.getById(...)
if (!guest) throw new Error('Guest not found')
```

Do this in the service, not just the UI.

---

### 9. CI verifies deployment, not application tests

**File:** `.github/workflows/deploy.yml`

The workflow runs:

```text
npm ci
npm run build
deploy
```

It does **not** run:

```text
npm test
npm run test:e2e
```

The repository contains both unit tests and Playwright tests, which is good, but a green deployment currently only tells you the production bundle built successfully.

The latest GitHub Actions run on the reviewed commit succeeded, but that workflow still does not exercise the tests.

I also found the `master` branch is currently unprotected.

**Fix:** at minimum:

```yaml
- run: npm test
```

before deployment, with E2E tests in a separate job if desired. Add branch protection/required checks afterward.

---

## Things that are already well done

The architecture is easy to follow: domain objects contain business concepts, services orchestrate rules, repositories isolate persistence, and React contexts expose state to the UI.

There is also a good amount of test coverage around the domain and services, lazy loading for heavier screens, an error boundary, accessible dialog semantics, and a clear offline-first data model.

The performance work in recent commits is also visible in the code, particularly memoized context values and grouped payment lookups.

## Recommended fix order

I would address these first:

1. **Reservation state-machine enforcement**
2. **Atomic reservation/payment/recurring writes**
3. **Safe transactional backup restore + full context refresh**
4. **Calendar week-range query**
5. **Date/timezone normalization**
6. **Notification scheduling lifecycle**
7. **CI test execution**

The biggest architectural improvement would be to make the IndexedDB repository expose **transactional/domain operations**, rather than having services perform multi-step read/check/write sequences over individually committed operations.

I did not execute the test suite locally, so I am not claiming the code passes or fails `npm test`; the review above is based on the current repository contents and the latest GitHub Actions state.
