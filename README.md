# Property Rental

A property management application for short-term rentals. Manage rooms, guests, and reservations through an intuitive mobile-first interface.

## Features

- **Dashboard** — Today's arrivals, departures, and occupancy at a glance
- **Calendar** — Monthly view of all reservations across rooms
- **Room Management** — Track room status (Available, Occupied, Cleaning, Maintenance)
- **Guest Directory** — Searchable guest list with contact info and stay history
- **Reservations** — Book rooms, check in/out guests, and cancel with automatic room status updates
- **Settings** — Property configuration, data import/export, and reset

## Privacy & Offline

This application runs entirely on your local machine. All data is stored in a local SQLite database and never leaves your device. There are no external API calls, no cloud services, no analytics, and no telemetry. The included service worker enables offline use after the initial load.

## How It Works

The app follows a layered architecture:

```
UI (React Components)
  → Context (State Management)
    → Services (Business Logic)
      → Repositories (IndexedDB Client)
        → Browser IndexedDB
```

All data is stored in the browser's IndexedDB. There is no server — the app runs entirely client-side.

**Domain models** enforce business rules — a room cannot be booked if occupied, reservations detect date conflicts, and check-in/check-out triggers automatic room status transitions. See `FLOWS.md` for the complete state machines and action flowcharts.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite 8, Tailwind CSS v4   |
| Storage  | IndexedDB (browser-local)            |
| Tooling  | TypeScript 5.7, Vitest, Zod         |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs on the Vite dev server (default port 8443). On first launch, use the setup screen to configure your property or load demo data.

## Scripts

| Command              | Description                     |
|----------------------|---------------------------------|
| `npm run dev`        | Start Vite dev server           |
| `npm run build`      | Production build                |
| `npm test`           | Run tests once                  |
| `npm run test:watch` | Run tests in watch mode         |
| `npm run format`     | Format code with oxfmt          |

## Project Structure

```
src/
  domain/         Domain models (Room, Guest, Reservation, Property)
  services/       Business logic and orchestration
  repositories/   IndexedDB data access
  api/            IndexedDB client and seed data
  context/        React context providers
  hooks/          Custom React hooks
  components/     UI components organized by feature
  schemas/        Zod validation schemas
```
