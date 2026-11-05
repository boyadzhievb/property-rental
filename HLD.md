# HLD — Property Rental

## Purpose

Offline-first PWA for short-term rental owners. Daily operating tool to manage rooms, guests, reservations, payments, and tasks. No backend — all data lives in IndexedDB, never leaves the device (OS cloud backups are disabled; manual JSON export is the only copy). Deployed to GitHub Pages; shipped to Google Play and the App Store via Capacitor 8.

## Architecture

```
UI (React 19 Components)
  ├─ reads state ─→ Context (one provider per entity — state, loading, errors)
  └─ calls actions ─→ Services (business operations, cross-entity orchestration)
                        → Repositories (IndexedDB CRUD, one per entity)
                          → IndexedDB via src/api/client.ts
                              │ after each commit: "these stores changed"
Context ←── reloads its own store ──┘ (same tab and other tabs)
```

- **Contexts own state and loading.** Each loads its list on mount and reloads by itself when its store changes. Screens never refresh lists after an action; `refresh()` remains for retrying after an error.
- **Services own business operations.** Screens call them directly (`reservationService.checkIn(id)`); they never touch React.
- **The data layer announces committed changes.** After a transaction commits, `src/api/sync.ts` announces which stores were written: to this tab directly and to other tabs over a `BroadcastChannel` (which does not deliver a tab's own messages). Failed transactions announce nothing; bulk operations (seed, reset, setup, restore) announce once. Contexts and hooks subscribe through `services/DataChangeService`, never `api/` directly.
- Overlapping reloads are safe: only the most recent load may update a context's state.

Validation at the boundary: Zod schemas in `src/schemas/` validate before writes.

## Source layout

```
src/
  domain/          Models with enforced business rules (state machines, guards)
  services/        Orchestration (e.g. check-in sets reservation + room status)
  repositories/    IndexedDB data access, one class per entity
  schemas/         Zod schemas for validation
  context/         React context providers (Room, Guest, Reservation, Payment, Task, Property, Locale, Theme)
  hooks/           View-specific logic (useToday, useCalendar, useGuests, etc.)
  components/
    today/         Dashboard — stat cards, timeline, task checklist
    calendar/      Weekly grid of reservations with inline actions
    rooms/         Room cards with status badges and transitions
    guests/        Alphabetical directory, per-guest history
    reports/       Revenue, occupancy, payment breakdown
    reservations/  Multi-step booking modal
    settings/      Config, language, theme, import/export
    layout/        PageHeader, TabBar
    ui/            Reusable primitives (StatCard, ErrorBanner, SettingsGroup)
  i18n/            Translations (en, bg, de, el, fr, es)
  api/             Data layer behind client.ts: db (connection, migrations), crud, seed, backup, sync (cross-tab)
e2e/               Playwright tests (setup, navigation, reservations, rooms, seed)
```

## Domain rules

State machines are the core invariant — see `FLOWS.md` for full diagrams.

**Room states:** Available → Occupied (check-in) → Cleaning (check-out) → Available. Maintenance is a side branch off Available. An occupied room cannot enter maintenance or be double-booked.

**Reservation states:** Confirmed → Checked In → Checked Out. Cancellation is allowed from Confirmed or Checked In. Terminal states: Checked Out, Cancelled.

**Key cross-entity effects:**
- Check-in → room becomes Occupied
- Check-out → room becomes Cleaning
- Completing a cleaning task → room becomes Available
- Cancellation of an occupied reservation → room goes to Cleaning

**Payments:** Separate entity linked to reservation by ID. Partial payments allowed. Balance = reservation price − sum(payments), computed only in `domain/balance.ts`. Cannot pay a cancelled reservation or exceed remaining balance.

**Money:** stored and computed as integer cents (`pricePerNightCents`, `priceCents`, `amountCents`), so sums are exact. Typed amounts become cents at the form (`parseMoneyInput`); `formatMoney` turns cents back into currency text. Data from before database version 6 / backup format 2 held decimal amounts and is converted on upgrade or import (`domain/money.ts`).

**Tasks:** Auto-generated daily from current state (cleaning needed, arrivals, outstanding payments). Deterministic IDs prevent duplicates on refresh. Completing a cleaning task triggers room → Available.

## Tech stack

| Layer      | Choice                             |
|------------|------------------------------------|
| UI         | React 19, Tailwind CSS v4          |
| Build      | Vite 8                             |
| Storage    | IndexedDB (browser-local)          |
| Validation | Zod 4                              |
| Icons      | Lucide React                       |
| Dates      | date-fns                           |
| Tests      | Vitest (unit), Playwright (e2e)    |
| Formatting | oxfmt                              |
| Linting    | oxlint (`.oxlintrc.json`)          |
| Language   | TypeScript 7                       |
| Node       | ≥22                                |

## Commands

```
npm run dev          → Vite dev server on port 8443
npm test             → Vitest unit tests
npm run test:e2e     → Playwright end-to-end tests
npm run build        → Production build to dist/
npm run format       → oxfmt
npm run lint         → oxlint (hooks rules, layer boundaries)
```

## Deployment

Auto-deploys to GitHub Pages on push to `master` via `.github/workflows/deploy.yml`. The app is a static SPA — no server required.

## Key design decisions

- **No backend by design** — privacy-first, works offline, zero infrastructure cost.
- **No OS cloud backups** — Android `allowBackup="false"` + `res/xml/data_extraction_rules.xml` (no Google backup, no device transfer); iOS excludes `Library/WebKit` from backup in `AppDelegate.swift`. Guest PII never reaches a Google/Apple account; the trade-off is that a lost phone without a manual export means lost data.
- **Domain models enforce rules** — UI cannot bypass state machine; services call domain methods that throw on invalid transitions.
- **One context per entity** — keeps re-renders scoped; contexts hold state and reload on data-change announcements, services hold the actions (decided 2026-11-05: automatic refresh instead of moving every action into a context).
- **Mobile via Capacitor** — same build output wrapped in native shell, no code changes needed. Native-only features (local notifications, filesystem export) are guarded by `Capacitor.isNativePlatform()`.
- **i18n without a framework** — simple key-value objects per locale, switched via LocaleContext.
