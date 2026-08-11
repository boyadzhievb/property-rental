# Property Rental

A property management application for short-term rentals. Manage rooms, guests, and reservations through an intuitive mobile-first interface.

## Features

- **Dashboard** — Today's arrivals, departures, and occupancy at a glance
- **Calendar** — Monthly view of all reservations across rooms
- **Room Management** — Track room status (Available, Occupied, Cleaning, Maintenance)
- **Guest Directory** — Searchable guest list with contact info and stay history
- **Reservations** — Book rooms, check in/out guests, and cancel with automatic room status updates
- **Settings** — Property configuration, data import/export, and reset

## How It Works

The app follows a layered architecture:

```
UI (React Components)
  → Context (State Management)
    → Services (Business Logic)
      → Repositories (API Client)
        → Express REST API
          → SQLite Database
```

**Domain models** enforce business rules — a room cannot be booked if occupied, reservations detect date conflicts, and check-in/check-out triggers automatic room status transitions. See `FLOWS.md` for the complete state machines and action flowcharts.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite 8, Tailwind CSS v4   |
| Backend  | Express, better-sqlite3              |
| Tooling  | TypeScript 5.7, Vitest, Zod         |

## Getting Started

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Seed the database with demo data
npm run db:seed

# Start the API server
npm run dev:api

# Start the frontend (in a separate terminal)
npm run dev
```

The frontend runs on the Vite dev server (default port 8443) and the API on port 3001.

## Scripts

| Command              | Description                     |
|----------------------|---------------------------------|
| `npm run dev`        | Start Vite dev server           |
| `npm run dev:api`    | Start API with hot reload       |
| `npm run db:seed`    | Seed database with sample data  |
| `npm run build`      | Production build                |
| `npm test`           | Run tests                       |
| `npm run format`     | Format code with oxfmt          |

## Project Structure

```
src/
  domain/         Domain models (Room, Guest, Reservation, Property)
  services/       Business logic and orchestration
  repositories/   API client abstractions
  context/        React context providers
  hooks/          Custom React hooks
  components/     UI components organized by feature
  schemas/        Zod validation schemas
server/
  index.ts        Express API routes
  repositories.ts SQLite data access
  db.ts           Database connection
  schemas.ts      Server-side validation
```
