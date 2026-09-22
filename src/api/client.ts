export interface Room {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
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
  recurrence?: { pattern: 'weekly' | 'biweekly' | 'monthly'; endDate: string };
  seriesId?: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer';
  note: string;
}

export interface Task {
  id: string;
  title: string;
  category: 'cleaning' | 'preparation' | 'payment' | 'communication' | 'custom';
  completed: boolean;
  date: string;
  linkedRoomId?: string;
  linkedReservationId?: string;
  linkedGuestId?: string;
  auto: boolean;
}

export interface PropertySettings {
  id: string;
  name: string;
  isConfigured: boolean;
}

const DB_NAME = 'property-rental';
const DB_VERSION = 4;

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);

function getSeedData() {
  const today = new Date();

  const rooms: Room[] = [
    { id: '101', name: 'Suite 1', status: 'Occupied', pricePerNight: 250, maxGuests: 4 },
    { id: '102', name: 'Ocean View', status: 'Available', pricePerNight: 200, maxGuests: 2 },
    { id: '103', name: 'Standard Room', status: 'Cleaning', pricePerNight: 150, maxGuests: 2 },
    { id: '104', name: 'Garden Villa', status: 'Occupied', pricePerNight: 300, maxGuests: 6 },
    { id: '105', name: 'Penthouse', status: 'Available', pricePerNight: 400, maxGuests: 4 },
  ];

  const guests: Guest[] = [
    { id: 'g1', name: 'John Smith', phone: '+1 555-0100', email: 'john@example.com', previousStays: 2, notes: 'Prefers extra pillows.' },
    { id: 'g2', name: 'Mary Brown', phone: '+1 555-0101', email: 'mary@example.com', previousStays: 0, notes: 'Allergic to feathers.' },
    { id: 'g3', name: 'Peter Jones', phone: '+1 555-0102', email: 'peter@example.com', previousStays: 5, notes: 'VIP Guest.' },
    { id: 'g4', name: 'Elena Kowalski', phone: '+48 600-123-456', email: 'elena@example.com', previousStays: 1, notes: 'Vegetarian breakfast.' },
    { id: 'g5', name: 'Carlos Rivera', phone: '+34 612-345-678', email: 'carlos@example.com', previousStays: 0, notes: 'Late check-in expected.' },
  ];

  const reservations: Reservation[] = [
    { id: 'r1', roomId: '101', guestId: 'g1', arrivalDate: fmt(subDays(today, 1)), departureDate: fmt(addDays(today, 2)), guestsCount: 2, status: 'Checked In', price: 750 },
    { id: 'r2', roomId: '104', guestId: 'g2', arrivalDate: fmt(today), departureDate: fmt(addDays(today, 4)), guestsCount: 1, status: 'Confirmed', price: 1200 },
    { id: 'r3', roomId: '103', guestId: 'g3', arrivalDate: fmt(subDays(today, 3)), departureDate: fmt(today), guestsCount: 2, status: 'Checked Out', price: 450 },
    { id: 'r4', roomId: '102', guestId: 'g4', arrivalDate: fmt(addDays(today, 1)), departureDate: fmt(addDays(today, 5)), guestsCount: 2, status: 'Confirmed', price: 800 },
    { id: 'r5', roomId: '105', guestId: 'g5', arrivalDate: fmt(addDays(today, 3)), departureDate: fmt(addDays(today, 7)), guestsCount: 3, status: 'Confirmed', price: 1600 },
  ];

  const payments: Payment[] = [
    { id: 'pay-1', reservationId: 'r1', amount: 500, date: fmt(subDays(today, 1)), method: 'card', note: 'Advance payment' },
    { id: 'pay-2', reservationId: 'r3', amount: 450, date: fmt(subDays(today, 1)), method: 'cash', note: '' },
    { id: 'pay-3', reservationId: 'r2', amount: 600, date: fmt(today), method: 'transfer', note: 'First installment' },
  ];

  return { rooms, guests, reservations, payments };
}

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
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id' });
        store.createIndex('reservationId', 'reservationId', { unique: false });
      }
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
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
  const { rooms, guests, reservations, payments } = getSeedData();
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'], 'readwrite');
  for (const room of rooms) tx.objectStore('rooms').put(room);
  for (const guest of guests) tx.objectStore('guests').put(guest);
  for (const res of reservations) tx.objectStore('reservations').put(res);
  for (const payment of payments) tx.objectStore('payments').put(payment);
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
  payments?: Payment[];
  tasks?: Task[];
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'], 'readonly');

  const [rooms, guests, reservations, payments, tasks, settings] = await Promise.all([
    new Promise<Room[]>((resolve) => { const r = tx.objectStore('rooms').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Guest[]>((resolve) => { const r = tx.objectStore('guests').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Reservation[]>((resolve) => { const r = tx.objectStore('reservations').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Payment[]>((resolve) => { const r = tx.objectStore('payments').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<Task[]>((resolve) => { const r = tx.objectStore('tasks').getAll(); r.onsuccess = () => resolve(r.result); }),
    new Promise<PropertySettings>((resolve) => { const r = tx.objectStore('settings').get('property'); r.onsuccess = () => resolve(r.result); }),
  ]);

  return { settings, rooms, guests, reservations, payments, tasks };
}

export interface ImportReport {
  skipped: {
    rooms: number;
    guests: number;
    reservations: number;
    payments: number;
    tasks: number;
  };
  total: number;
}

export async function importBackup(data: BackupData): Promise<ImportReport> {
  const { RoomSchema } = await import('../schemas/RoomSchema');
  const { GuestSchema } = await import('../schemas/GuestSchema');
  const { ReservationSchema } = await import('../schemas/ReservationSchema');
  const { PaymentSchema } = await import('../schemas/PaymentSchema');
  const { TaskSchema } = await import('../schemas/TaskSchema');

  const allRooms = data.rooms ?? [];
  const allGuests = data.guests ?? [];
  const allReservations = data.reservations ?? [];
  const allPayments = data.payments ?? [];
  const allTasks = data.tasks ?? [];

  const validRooms = allRooms.filter(r => RoomSchema.safeParse(r).success);
  const validGuests = allGuests.filter(g => GuestSchema.safeParse(g).success);
  const validReservations = allReservations.filter(r => ReservationSchema.safeParse(r).success);
  const validPayments = allPayments.filter(p => PaymentSchema.safeParse(p).success);
  const validTasks = allTasks.filter(t => TaskSchema.safeParse(t).success);

  const skipped = {
    rooms: allRooms.length - validRooms.length,
    guests: allGuests.length - validGuests.length,
    reservations: allReservations.length - validReservations.length,
    payments: allPayments.length - validPayments.length,
    tasks: allTasks.length - validTasks.length,
  };
  const totalSkipped = skipped.rooms + skipped.guests + skipped.reservations + skipped.payments + skipped.tasks;

  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'], 'readwrite');

  tx.objectStore('rooms').clear();
  tx.objectStore('guests').clear();
  tx.objectStore('reservations').clear();
  tx.objectStore('payments').clear();
  tx.objectStore('tasks').clear();

  for (const room of validRooms) tx.objectStore('rooms').put(room);
  for (const guest of validGuests) tx.objectStore('guests').put(guest);
  for (const res of validReservations) tx.objectStore('reservations').put(res);
  for (const payment of validPayments) tx.objectStore('payments').put(payment);
  for (const task of validTasks) tx.objectStore('tasks').put(task);
  if (data.settings) tx.objectStore('settings').put({ ...data.settings, id: 'property', isConfigured: true });
  else tx.objectStore('settings').put({ id: 'property', name: 'My Property', isConfigured: true });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return { skipped, total: totalSkipped };
}

export async function resetData() {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'], 'readwrite');
  tx.objectStore('rooms').clear();
  tx.objectStore('guests').clear();
  tx.objectStore('reservations').clear();
  tx.objectStore('payments').clear();
  tx.objectStore('tasks').clear();
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
    status: 'Available' as Room['status'],
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

function getByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).index(indexName).getAll(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export interface BatchOperation {
  store: string;
  data: unknown;
}

export interface StoreAccessor {
  get: <T>(key: string) => Promise<T | undefined>;
  getAllByIndex: <T>(indexName: string, key: IDBValidKey) => Promise<T[]>;
  put: (data: unknown) => void;
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function atomicReadWrite<T>(
  storeNames: string[],
  callback: (stores: Record<string, StoreAccessor>) => Promise<T>,
): Promise<T> {
  const database = await getDB();
  const transaction = database.transaction(storeNames, 'readwrite');

  const stores: Record<string, StoreAccessor> = {};
  for (const name of storeNames) {
    const objectStore = transaction.objectStore(name);
    stores[name] = {
      get: <V>(key: string) => wrapRequest<V>(objectStore.get(key)),
      getAllByIndex: <V>(indexName: string, key: IDBValidKey) =>
        wrapRequest<V[]>(objectStore.index(indexName).getAll(key)),
      put: (data: unknown) => { objectStore.put(data); },
    };
  }

  const result = await callback(stores);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  return result;
}

export async function batchPut(operations: BatchOperation[]): Promise<void> {
  const db = await getDB();
  const storeNames = [...new Set(operations.map(operation => operation.store))];
  const transaction = db.transaction(storeNames, 'readwrite');
  for (const operation of operations) {
    transaction.objectStore(operation.store).put(operation.data);
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
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
        return all.filter(r => r.departureDate >= params.from! && r.arrivalDate <= params.to!);
      }),
    getById: (id: string) => getById<Reservation>('reservations', id),
    create: (reservation: Reservation) => put('reservations', reservation),
    update: (id: string, data: Partial<Reservation>) =>
      getById<Reservation>('reservations', id).then(existing => put('reservations', { ...existing, ...data })),
    delete: (id: string) => deleteById('reservations', id),
  },
  payments: {
    getAll: () => getAll<Payment>('payments'),
    getByReservationId: (reservationId: string) =>
      getByIndex<Payment>('payments', 'reservationId', reservationId),
    getById: (id: string) => getById<Payment>('payments', id),
    create: (payment: Payment) => put('payments', payment),
    delete: (id: string) => deleteById('payments', id),
  },
  tasks: {
    getAll: () => getAll<Task>('tasks'),
    getByDate: (date: string) =>
      getByIndex<Task>('tasks', 'date', date),
    getById: (id: string) => getById<Task>('tasks', id),
    put: (task: Task) => put('tasks', task),
    delete: (id: string) => deleteById('tasks', id),
  },
  settings: {
    getProperty: (): Promise<PropertySettings> =>
      getById<PropertySettings>('settings', 'property').then(s => s ?? { id: 'property', name: 'My Property', isConfigured: false }),
    saveProperty: (data: Partial<PropertySettings>) =>
      getById<PropertySettings>('settings', 'property')
        .then(existing => put('settings', { ...{ id: 'property', name: 'My Property', isConfigured: false }, ...existing, ...data })),
  },
};
