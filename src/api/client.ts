export interface Room {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Not available';
  pricePerNight: number;
  maxGuests: number;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
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

export interface PropertySettings {
  id: string;
  name: string;
  isConfigured: boolean;
}

const DB_NAME = 'property-rental';
const DB_VERSION = 2;

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);

const SEED_ROOMS: Room[] = [
  { id: '101', name: 'Suite 1', status: 'Occupied', pricePerNight: 250, maxGuests: 4 },
  { id: '102', name: 'Ocean View', status: 'Available', pricePerNight: 200, maxGuests: 2 },
  { id: '103', name: 'Standard Room', status: 'Cleaning', pricePerNight: 150, maxGuests: 2 },
  { id: '104', name: 'Garden Villa', status: 'Occupied', pricePerNight: 300, maxGuests: 6 },
];

const SEED_GUESTS: Guest[] = [
  { id: 'g1', name: 'John Smith', phone: '+1 555-0100', email: 'john@example.com', previousStays: 2, notes: 'Prefers extra pillows.' },
  { id: 'g2', name: 'Mary Brown', phone: '+1 555-0101', email: 'mary@example.com', previousStays: 0, notes: 'Allergic to feathers.' },
  { id: 'g3', name: 'Peter Jones', phone: '+1 555-0102', email: 'peter@example.com', previousStays: 5, notes: 'VIP Guest.' },
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
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function ensureSettings(db: IDBDatabase) {
  const tx = db.transaction('settings', 'readonly');
  const existing = await new Promise<PropertySettings | undefined>((resolve) => {
    const req = tx.objectStore('settings').get('property');
    req.onsuccess = () => resolve(req.result);
  });

  if (existing) return;

  const seedTx = db.transaction('settings', 'readwrite');
  seedTx.objectStore('settings').put({ id: 'property', name: 'My Property', isConfigured: false });
  await new Promise<void>((resolve, reject) => {
    seedTx.oncomplete = () => resolve();
    seedTx.onerror = () => reject(seedTx.error);
  });
}

export async function seedDemoData() {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'settings'], 'readwrite');
  for (const room of SEED_ROOMS) tx.objectStore('rooms').put(room);
  for (const guest of SEED_GUESTS) tx.objectStore('guests').put(guest);
  for (const res of SEED_RESERVATIONS) tx.objectStore('reservations').put(res);
  tx.objectStore('settings').put({ id: 'property', name: 'Villa Blanca', isConfigured: true });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface BackupData {
  settings?: PropertySettings;
  rooms?: Room[];
  guests?: Guest[];
  reservations?: Reservation[];
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'settings'], 'readonly');

  const [rooms, guests, reservations, settings] = await Promise.all([
    new Promise<Room[]>((resolve) => { const r = tx.objectStore('rooms').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Guest[]>((resolve) => { const r = tx.objectStore('guests').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Reservation[]>((resolve) => { const r = tx.objectStore('reservations').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<PropertySettings>((resolve) => { const r = tx.objectStore('settings').get('property'); r.onsuccess = () => resolve(r.result); }),
  ]);

  return { settings, rooms, guests, reservations };
}

export async function importBackup(data: BackupData) {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'settings'], 'readwrite');

  tx.objectStore('rooms').clear();
  tx.objectStore('guests').clear();
  tx.objectStore('reservations').clear();

  if (data.rooms) for (const room of data.rooms) tx.objectStore('rooms').put(room);
  if (data.guests) for (const guest of data.guests) tx.objectStore('guests').put(guest);
  if (data.reservations) for (const res of data.reservations) tx.objectStore('reservations').put(res);
  if (data.settings) tx.objectStore('settings').put({ ...data.settings, id: 'property', isConfigured: true });
  else tx.objectStore('settings').put({ id: 'property', name: 'My Property', isConfigured: true });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetData() {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'settings'], 'readwrite');
  tx.objectStore('rooms').clear();
  tx.objectStore('guests').clear();
  tx.objectStore('reservations').clear();
  tx.objectStore('settings').put({ id: 'property', name: 'My Property', isConfigured: false });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function configureProperty(name: string, roomCount: number) {
  const db = await getDB();
  const rooms: Room[] = Array.from({ length: roomCount }).map((_, i) => ({
    id: `room-${i + 1}`,
    name: `Room ${i + 1}`,
    status: 'Available' as const,
    pricePerNight: 100,
    maxGuests: 2,
  }));
  const tx = db.transaction(['rooms', 'settings'], 'readwrite');
  for (const room of rooms) tx.objectStore('rooms').put(room);
  tx.objectStore('settings').put({ id: 'property', name: name || 'My Property', isConfigured: true });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB().then(async (db) => {
      await ensureSettings(db);
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
  settings: {
    getProperty: (): Promise<PropertySettings> =>
      getById<PropertySettings>('settings', 'property').then(s => s ?? { id: 'property', name: 'My Property', isConfigured: false }),
    saveProperty: (data: Partial<PropertySettings>) =>
      getById<PropertySettings>('settings', 'property')
        .then(existing => put('settings', { ...{ id: 'property', name: 'My Property', isConfigured: false }, ...existing, ...data })),
  },
};
