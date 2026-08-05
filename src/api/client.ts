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

const DB_NAME = 'property-rental';
const DB_VERSION = 1;

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);

const SEED_ROOMS: Room[] = [
  { id: '101', name: 'Suite 1', status: 'Occupied', pricePerNight: 250, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&auto=format' },
  { id: '102', name: 'Ocean View', status: 'Available', pricePerNight: 200, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&h=400&fit=crop&auto=format' },
  { id: '103', name: 'Standard Room', status: 'Cleaning', pricePerNight: 150, image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop&auto=format' },
  { id: '104', name: 'Garden Villa', status: 'Occupied', pricePerNight: 300, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop&auto=format' },
];

const SEED_GUESTS: Guest[] = [
  { id: 'g1', name: 'John Smith', phone: '+1 555-0100', email: 'john@example.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format', previousStays: 2, notes: 'Prefers extra pillows.' },
  { id: 'g2', name: 'Mary Brown', phone: '+1 555-0101', email: 'mary@example.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&auto=format', previousStays: 0, notes: 'Allergic to feathers.' },
  { id: 'g3', name: 'Peter Jones', phone: '+1 555-0102', email: 'peter@example.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&auto=format', previousStays: 5, notes: 'VIP Guest.' },
];

const SEED_RESERVATIONS: Reservation[] = [
  { id: 'r1', roomId: '101', guestId: 'g1', arrivalDate: fmt(subDays(today, 1)), departureDate: fmt(addDays(today, 2)), guestsCount: 2, status: 'Checked In', price: 750 },
  { id: 'r2', roomId: '104', guestId: 'g2', arrivalDate: fmt(today), departureDate: fmt(addDays(today, 4)), guestsCount: 1, status: 'Confirmed', price: 1200 },
  { id: 'r3', roomId: '103', guestId: 'g3', arrivalDate: fmt(subDays(today, 3)), departureDate: fmt(today), guestsCount: 2, status: 'Checked Out', price: 450 },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('rooms')) {
        db.createObjectStore('rooms', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('guests')) {
        db.createObjectStore('guests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reservations')) {
        const store = db.createObjectStore('reservations', { keyPath: 'id' });
        store.createIndex('roomId', 'roomId', { unique: false });
        store.createIndex('arrivalDate', 'arrivalDate', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedIfEmpty(db: IDBDatabase) {
  const tx = db.transaction(['rooms', 'guests', 'reservations'], 'readonly');
  const roomCount = await new Promise<number>((resolve) => {
    const req = tx.objectStore('rooms').count();
    req.onsuccess = () => resolve(req.result);
  });

  if (roomCount > 0) return;

  const seedTx = db.transaction(['rooms', 'guests', 'reservations'], 'readwrite');
  for (const room of SEED_ROOMS) seedTx.objectStore('rooms').put(room);
  for (const guest of SEED_GUESTS) seedTx.objectStore('guests').put(guest);
  for (const res of SEED_RESERVATIONS) seedTx.objectStore('reservations').put(res);

  await new Promise<void>((resolve, reject) => {
    seedTx.oncomplete = () => resolve();
    seedTx.onerror = () => reject(seedTx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB().then(async (db) => {
      await seedIfEmpty(db);
      return db;
    });
  }
  return dbPromise;
}

function getAll<T>(storeName: string): Promise<T[]> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function getById<T>(storeName: string, id: string): Promise<T> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function put<T>(storeName: string, item: T): Promise<T> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  });
}

function deleteById(storeName: string, id: string): Promise<void> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export const api = {
  rooms: {
    getAll: () => getAll<Room>('rooms'),
    getById: (id: string) => getById<Room>('rooms', id),
    create: (room: Room) => put('rooms', room),
    update: (id: string, data: Partial<Room>) =>
      getById<Room>('rooms', id).then(existing => put('rooms', { ...existing, ...data })),
    delete: (id: string) => deleteById('rooms', id),
  },
  guests: {
    getAll: () => getAll<Guest>('guests'),
    getById: (id: string) => getById<Guest>('guests', id),
    create: (guest: Guest) => put('guests', guest),
    update: (id: string, data: Partial<Guest>) =>
      getById<Guest>('guests', id).then(existing => put('guests', { ...existing, ...data })),
    delete: (id: string) => deleteById('guests', id),
  },
  reservations: {
    getAll: (params?: { from?: string; to?: string }) =>
      getAll<Reservation>('reservations').then(all => {
        if (!params?.from || !params?.to) return all;
        return all.filter(r => r.departureDate > params.from! && r.arrivalDate < params.to!);
      }),
    getById: (id: string) => getById<Reservation>('reservations', id),
    create: (reservation: Reservation) => put('reservations', reservation),
    update: (id: string, data: Partial<Reservation>) =>
      getById<Reservation>('reservations', id).then(existing => put('reservations', { ...existing, ...data })),
    delete: (id: string) => deleteById('reservations', id),
  },
};
