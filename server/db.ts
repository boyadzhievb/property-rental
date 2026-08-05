import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    guests_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK(status IN ('Confirmed', 'Checked In', 'Checked Out', 'Cancelled')),
    price REAL NOT NULL,
    notes TEXT
  );
`);

export default db;
