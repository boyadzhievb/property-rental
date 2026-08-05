import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');

let db: Database.Database;
try {
  db = new Database(dbPath);
} catch (err) {
  logger.fatal({ err, dbPath }, 'Failed to open database');
  process.exit(1);
}

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

logger.info({ dbPath }, 'Database connected');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Available', 'Occupied', 'Cleaning', 'Not available')),
    price_per_night REAL NOT NULL,
    image TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar TEXT NOT NULL,
    previous_stays INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    guest_id TEXT NOT NULL REFERENCES guests(id),
    arrival_date TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    guests_count INTEGER NOT NULL DEFAULT 1 CHECK(guests_count > 0),
    status TEXT NOT NULL CHECK(status IN ('Confirmed', 'Checked In', 'Checked Out', 'Cancelled')),
    price REAL NOT NULL CHECK(price >= 0),
    notes TEXT,
    CHECK(arrival_date < departure_date)
  );

  CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON reservations(guest_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_arrival_date ON reservations(arrival_date);
  CREATE INDEX IF NOT EXISTS idx_reservations_departure_date ON reservations(departure_date);
`);

export default db;
