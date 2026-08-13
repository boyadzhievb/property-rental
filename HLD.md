# HLD — Property Rental

## Purpose

Offline-first PWA for short-term rental owners. Daily operating tool to manage rooms, guests, reservations, payments, and tasks. No backend — all data lives in IndexedDB, never leaves the device. Deployed to GitHub Pages; mobile wrap planned via Capacitor.

## Architecture

```
UI (React 19 Components)
  → Context (one provider per entity — state + actions)
    → Services (business logic, cross-entity orchestration)
      → Repositories (IndexedDB CRUD, one per entity)
        → IndexedDB via src/api/client.ts
```

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
  i18n/            Translations (en, bg, de, el, fr)
  api/             DB client, seed data, backup/restore
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

**Payments:** Separate entity linked to reservation by ID. Partial payments allowed. Balance = reservation price − sum(payments). Cannot pay a cancelled reservation or exceed remaining balance.

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
| Language   | TypeScript 5.7                     |
| Node       | ≥22                                |

## Commands

```
npm run dev          → Vite dev server on port 8443
npm test             → Vitest unit tests
npm run test:e2e     → Playwright end-to-end tests
npm run build        → Production build to dist/
npm run format       → oxfmt
```

## Deployment

Auto-deploys to GitHub Pages on push to `master` via `.github/workflows/deploy.yml`. The app is a static SPA — no server required.

## Key design decisions

- **No backend by design** — privacy-first, works offline, zero infrastructure cost.
- **Domain models enforce rules** — UI cannot bypass state machine; services call domain methods that throw on invalid transitions.
- **One context per entity** — keeps re-renders scoped; contexts hold both state and dispatch methods.
- **Mobile via Capacitor** — same build output wrapped in native shell, no code changes needed (plan in `TODO-mobile.md`).
- **i18n without a framework** — simple key-value objects per locale, switched via LocaleContext.
