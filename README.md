# Property Rental

A property management application for short-term rentals. An owner's daily operating assistant — manage rooms, guests, reservations, payments, and tasks through an intuitive mobile-first interface.

## Features

- **Today Dashboard** — Actionable daily view: arrivals, departures, occupied rooms, cleaning status, and a task checklist. Clickable stat cards filter the view.
- **Tasks** — Auto-generated housekeeping tasks (clean room, prepare for guest, check payment) plus manual tasks. Completing a cleaning task automatically marks the room as available.
- **Calendar** — Weekly view of all reservations across rooms with check-in/check-out/cancel actions and inline payment recording.
- **Room Management** — Track room status (Available, Occupied, Cleaning, Maintenance) with enforced state machine transitions.
- **Guest Directory** — Alphabetical index with first-letter navigation, phone numbers, and per-guest reservation history with payment details.
- **Payments** — Separate payment entity tracking partial/advance payments per reservation. Record amount, method (cash/card/transfer), and notes. Balance tracking across the system.
- **Reports** — Revenue summary, occupancy rate, payment breakdown by method, outstanding balances, and recent payment history. Filterable by week or month with period navigation.
- **Reservations** — Book rooms, check in/out guests, and cancel with automatic room status updates. Date conflict detection and capacity validation.
- **Settings** — Property configuration, language selection (EN/BG/DE/EL/FR), appearance (light/dark/system), data import/export, and reset.

## Privacy & Offline

This application runs entirely on your device. All data is stored in the browser's IndexedDB and never leaves your machine. There are no external API calls, no cloud services, no analytics, and no telemetry. The included service worker enables offline use after the initial load.

## How It Works

The app follows a layered architecture:

```
UI (React Components)
  → Context (State Management)
    → Services (Business Logic)
      → Repositories (Data Access)
        → IndexedDB (Browser Storage)
```

**Domain models** enforce business rules — a room cannot be booked if occupied, reservations detect date conflicts, check-in/check-out triggers automatic room status transitions, and payments track balances per reservation. See `FLOWS.md` for the complete state machines and action flowcharts.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite 8, Tailwind CSS v4   |
| Storage  | IndexedDB (browser-local)           |
| Validation | Zod 4                             |
| Tooling  | TypeScript 5.7, Vitest, Playwright  |
| Icons    | Lucide React                        |
| Dates    | date-fns                            |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs on the Vite dev server (default port 8443). On first launch, use the setup screen to configure your property or load demo data.

## Scripts

| Command                  | Description                          |
|--------------------------|--------------------------------------|
| `npm run dev`            | Start Vite dev server                |
| `npm run build`          | Production build                     |
| `npm test`              | Run unit tests once                  |
| `npm run test:watch`    | Run unit tests in watch mode         |
| `npm run test:e2e`      | Run Playwright end-to-end tests      |
| `npm run test:e2e:ui`   | Run E2E tests with Playwright UI     |
| `npm run format`        | Format code with oxfmt               |

## Testing

### Unit Tests (Vitest)

Domain model tests covering:
- **Room** — status transitions, guards (occupied cannot go to maintenance, etc.)
- **Guest** — construction, full name, stay history
- **Reservation** — status transitions, duration calculation, overlap detection, capacity
- **Payment** — construction, method variants, serialization
- **Task** — complete/reopen, categories, linked entities

Component tests:
- **StatCard** — rendering, active state, click handling
- **TabBar** — navigation items, active tab highlighting

### End-to-End Tests (Playwright)

- **Setup & Navigation** — first-launch setup flow, tab switching
- **Seed Data** — demo data loads correctly across all views including reports
- **Reservation Flow** — new guest creation, existing guest selection, booking validation
- **Room Management** — status transitions via UI actions

## Project Structure

```
src/
  domain/         Domain models (Room, Guest, Reservation, Payment, Task)
  services/       Business logic and orchestration
  repositories/   Data access layer (IndexedDB)
  api/            IndexedDB client, seed data, backup/restore
  schemas/        Zod validation schemas
  context/        React context providers (Room, Guest, Reservation, Payment, Task)
  hooks/          Custom React hooks
  components/
    today/        Dashboard and task management
    calendar/     Weekly calendar with reservation details
    rooms/        Room cards and status management
    guests/       Guest directory with payment tracking
    reports/      Financial reports and analytics
    reservations/ Reservation creation wizard
    settings/     App configuration
    layout/       Shared layout (PageHeader, TabBar)
    ui/           Reusable UI components (StatCard, ErrorBanner)
  i18n/           Translations (en, bg, de, el, fr)
e2e/              Playwright end-to-end tests
```

## Deployment

The app auto-deploys to GitHub Pages on push to `master` via the included GitHub Actions workflow. See `.github/workflows/deploy.yml`.

## Mobile

See `TODO-mobile.md` for the plan to wrap this app with Capacitor for Google Play Store and iOS App Store distribution.
