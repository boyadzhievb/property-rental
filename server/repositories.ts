import db from './db.js';

export interface Room {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Not available';
  pricePerNight: number;
  image: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  previousStays: number;
  notes: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  guestId: string;
  arrivalDate: string;
  departureDate: string;
  guestsCount: number;
  status: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
  price: number;
  notes?: string;
}

// --- Rooms ---

export const roomsRepo = {
  getAll(): Room[] {
    const rows = db.prepare('SELECT * FROM rooms').all() as any[];
    return rows.map(mapRoom);
  },

  getById(id: string): Room | undefined {
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as any;
    return row ? mapRoom(row) : undefined;
  },

  create(room: Room): Room {
    db.prepare(
      'INSERT INTO rooms (id, name, status, price_per_night, image) VALUES (?, ?, ?, ?, ?)'
    ).run(room.id, room.name, room.status, room.pricePerNight, room.image);
    return room;
  },

  update(id: string, data: Partial<Omit<Room, 'id'>>): Room | undefined {
    const existing = roomsRepo.getById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    db.prepare(
      'UPDATE rooms SET name = ?, status = ?, price_per_night = ?, image = ? WHERE id = ?'
    ).run(merged.name, merged.status, merged.pricePerNight, merged.image, id);
    return merged;
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// --- Guests ---

export const guestsRepo = {
  getAll(): Guest[] {
    const rows = db.prepare('SELECT * FROM guests').all() as any[];
    return rows.map(mapGuest);
  },

  getById(id: string): Guest | undefined {
    const row = db.prepare('SELECT * FROM guests WHERE id = ?').get(id) as any;
    return row ? mapGuest(row) : undefined;
  },

  create(guest: Guest): Guest {
    db.prepare(
      'INSERT INTO guests (id, name, phone, email, avatar, previous_stays, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(guest.id, guest.name, guest.phone, guest.email, guest.avatar, guest.previousStays, guest.notes);
    return guest;
  },

  update(id: string, data: Partial<Omit<Guest, 'id'>>): Guest | undefined {
    const existing = guestsRepo.getById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    db.prepare(
      'UPDATE guests SET name = ?, phone = ?, email = ?, avatar = ?, previous_stays = ?, notes = ? WHERE id = ?'
    ).run(merged.name, merged.phone, merged.email, merged.avatar, merged.previousStays, merged.notes, id);
    return merged;
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM guests WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// --- Reservations ---

export const reservationsRepo = {
  getAll(): Reservation[] {
    const rows = db.prepare('SELECT * FROM reservations').all() as any[];
    return rows.map(mapReservation);
  },

  getByMonth(from: string, to: string): Reservation[] {
    const rows = db.prepare(
      'SELECT * FROM reservations WHERE departure_date >= ? AND arrival_date <= ?'
    ).all(from, to) as any[];
    return rows.map(mapReservation);
  },

  getById(id: string): Reservation | undefined {
    const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as any;
    return row ? mapReservation(row) : undefined;
  },

  create(reservation: Reservation): Reservation {
    db.prepare(
      'INSERT INTO reservations (id, room_id, guest_id, arrival_date, departure_date, guests_count, status, price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      reservation.id, reservation.roomId, reservation.guestId,
      reservation.arrivalDate, reservation.departureDate,
      reservation.guestsCount, reservation.status, reservation.price, reservation.notes ?? null
    );
    return reservation;
  },

  update(id: string, data: Partial<Omit<Reservation, 'id'>>): Reservation | undefined {
    const existing = reservationsRepo.getById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...data };
    db.prepare(
      'UPDATE reservations SET room_id = ?, guest_id = ?, arrival_date = ?, departure_date = ?, guests_count = ?, status = ?, price = ?, notes = ? WHERE id = ?'
    ).run(
      merged.roomId, merged.guestId, merged.arrivalDate, merged.departureDate,
      merged.guestsCount, merged.status, merged.price, merged.notes ?? null, id
    );
    return merged;
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// --- Row mappers ---

function mapRoom(row: any): Room {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    pricePerNight: row.price_per_night,
    image: row.image,
  };
}

function mapGuest(row: any): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    avatar: row.avatar,
    previousStays: row.previous_stays,
    notes: row.notes,
  };
}

function mapReservation(row: any): Reservation {
  return {
    id: row.id,
    roomId: row.room_id,
    guestId: row.guest_id,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    guestsCount: row.guests_count,
    status: row.status,
    price: row.price,
    notes: row.notes ?? undefined,
  };
}
