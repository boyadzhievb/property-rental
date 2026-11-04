
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
  template?: { kind: 'clean' | 'prepare' | 'checkPayment'; roomName?: string; guestName?: string };
}

export interface PropertySettings {
  id: string;
  name: string;
  isConfigured: boolean;
  /** ISO 4217 code chosen at setup (see domain/currency). Missing for data from before currencies. */
  currency?: string;
}

const DB_NAME = 'property-rental';
const DB_VERSION = 5;

import { format as fmtDate, addDays, subDays } from 'date-fns';
import { notifyOtherTabs } from './sync';
import { BACKUP_SCHEMA_VERSION } from '../schemas/BackupSchema';

const fmt = (d: Date) => fmtDate(d, 'yyyy-MM-dd');

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
    { id: 'r2', roomId: '104', guestId: 'g2', arrivalDate: fmt(today), departureDate: fmt(addDays(today, 4)), guestsCount: 1, status: 'Checked In', price: 1200 },
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

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore('rooms', { keyPath: 'id' });
        db.createObjectStore('guests', { keyPath: 'id' });
        const resStore = db.createObjectStore('reservations', { keyPath: 'id' });
        resStore.createIndex('roomId', 'roomId', { unique: false });
        resStore.createIndex('arrivalDate', 'arrivalDate', { unique: false });
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('payments')) {
          const payStore = db.createObjectStore('payments', { keyPath: 'id' });
          payStore.createIndex('reservationId', 'reservationId', { unique: false });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('date', 'date', { unique: false });
        }
      }

      if (oldVersion < 5) {
        const tx = request.transaction!;
        const resStore = tx.objectStore('reservations');
        if (!resStore.indexNames.contains('guestId')) {
          resStore.createIndex('guestId', 'guestId', { unique: false });
        }
        if (!resStore.indexNames.contains('seriesId')) {
          resStore.createIndex('seriesId', 'seriesId', { unique: false });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // A newer app version (e.g. in another tab after an update) wants to upgrade the schema.
      // Close this connection so the upgrade is not blocked, then reload into the new version;
      // this tab's code no longer matches the database.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        if (typeof window !== 'undefined') window.location.reload();
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    // Another tab still holds an older connection. The open completes once that tab closes it
    // (it does so in its own onversionchange handler); until then, make the wait visible.
    request.onblocked = () => {
      console.warn('Database upgrade is waiting for another tab of this app to close.');
    };
  });
}

/**
 * Ask the browser not to evict our IndexedDB under storage pressure (Safari in particular
 * evicts site data of PWAs that are not used for a while). Best effort: never blocks startup.
 */
function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') return;
  navigator.storage.persist().catch(() => {
    // Not granted or not supported: data stays in best-effort storage, nothing else to do.
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

export interface BackupPreferences {
  locale?: string;
  theme?: string;
  notificationsEnabled?: boolean;
}

export interface BackupData {
  schemaVersion?: number;
  settings?: Partial<Pick<PropertySettings, 'name' | 'currency'>>;
  rooms?: Room[];
  guests?: Guest[];
  reservations?: Reservation[];
  payments?: Payment[];
  tasks?: Task[];
  preferences?: BackupPreferences;
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
    new Promise<PropertySettings | undefined>((resolve) => { const r = tx.objectStore('settings').get('property'); r.onsuccess = () => resolve(r.result); }),
  ]);

  const preferences: BackupPreferences = {
    locale: localStorage.getItem('app-locale') ?? undefined,
    theme: localStorage.getItem('theme-mode') ?? undefined,
    notificationsEnabled: localStorage.getItem('notifications-enabled') === 'true',
  };

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    settings: settings ? { name: settings.name, ...(settings.currency ? { currency: settings.currency } : {}) } : undefined,
    rooms, guests, reservations, payments, tasks, preferences,
  };
}

/**
 * Replace all stored records with `data` in one transaction. Callers must pass records that
 * were already validated and parsed (see BackupService.import); nothing is validated here.
 */
export async function importBackup(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'], 'readwrite');

  tx.objectStore('rooms').clear();
  tx.objectStore('guests').clear();
  tx.objectStore('reservations').clear();
  tx.objectStore('payments').clear();
  tx.objectStore('tasks').clear();

  for (const room of data.rooms ?? []) tx.objectStore('rooms').put(room);
  for (const guest of data.guests ?? []) tx.objectStore('guests').put(guest);
  for (const reservation of data.reservations ?? []) tx.objectStore('reservations').put(reservation);
  for (const payment of data.payments ?? []) tx.objectStore('payments').put(payment);
  for (const task of data.tasks ?? []) tx.objectStore('tasks').put(task);
  tx.objectStore('settings').put({
    id: 'property',
    name: data.settings?.name ?? 'My Property',
    isConfigured: true,
    ...(data.settings?.currency ? { currency: data.settings.currency } : {}),
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (data.preferences) {
    if (data.preferences.locale) localStorage.setItem('app-locale', data.preferences.locale);
    if (data.preferences.theme) localStorage.setItem('theme-mode', data.preferences.theme);
    if (data.preferences.notificationsEnabled !== undefined) {
      localStorage.setItem('notifications-enabled', String(data.preferences.notificationsEnabled));
    }
  }
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

export async function configureProperty(name: string, roomCount: number, currency?: string) {
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
  tx.objectStore('settings').put({ id: 'property', name: name || 'My Property', isConfigured: true, ...(currency ? { currency } : {}) });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    requestPersistentStorage();
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

function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Resolve when `transaction` commits; reject when it fails or is aborted. Attach it before
 * issuing requests that may finish the transaction. Aborts without a request error (quota
 * exceeded, explicit abort) only fire `abort`, so that handler is required to avoid hanging.
 */
export function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    // Request errors bubble here before transaction.error is set; report the request's error.
    transaction.onerror = (event) => {
      const requestError = event.target instanceof IDBRequest ? event.target.error : null;
      reject(transaction.error ?? requestError ?? new DOMException('Transaction failed', 'UnknownError'));
    };
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

async function put<T>(storeName: string, item: T): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const done = waitForTransaction(tx);
  tx.objectStore(storeName).put(item);
  await done;
  notifyOtherTabs();
  return item;
}

/** Merge `data` into an existing record, reading and writing in one transaction. Throws if the record is missing. */
async function updateById<T extends object>(storeName: string, id: string, data: Partial<T>): Promise<T> {
  return atomicReadWrite([storeName], async (stores) => {
    const existing = await stores[storeName].get<T>(id);
    if (existing === undefined) throw new Error(`${storeName} record "${id}" not found`);
    const updated = { ...existing, ...data };
    stores[storeName].put(updated);
    return updated;
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const done = waitForTransaction(tx);
  tx.objectStore(storeName).delete(id);
  await done;
  notifyOtherTabs();
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
  getAll: <T>() => Promise<T[]>;
  getAllByIndex: <T>(indexName: string, key: IDBValidKey) => Promise<T[]>;
  put: (data: unknown) => void;
  delete: (key: string) => void;
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Run `callback` inside one readwrite transaction. If the callback throws, the transaction is
 * aborted and none of its writes are kept.
 *
 * The callback may only await requests made through `stores`: awaiting anything else (another
 * getDB() call, a timer, fetch) lets the transaction auto-commit, after which further requests
 * fail with TransactionInactiveError.
 */
export async function atomicReadWrite<T>(
  storeNames: string[],
  callback: (stores: Record<string, StoreAccessor>) => Promise<T>,
): Promise<T> {
  const database = await getDB();
  const transaction = database.transaction(storeNames, 'readwrite');
  const done = waitForTransaction(transaction);

  const stores: Record<string, StoreAccessor> = {};
  for (const name of storeNames) {
    const objectStore = transaction.objectStore(name);
    stores[name] = {
      get: <V>(key: string) => wrapRequest<V | undefined>(objectStore.get(key)),
      getAll: <V>() => wrapRequest<V[]>(objectStore.getAll()),
      getAllByIndex: <V>(indexName: string, key: IDBValidKey) =>
        wrapRequest<V[]>(objectStore.index(indexName).getAll(key)),
      put: (data: unknown) => { objectStore.put(data); },
      delete: (key: string) => { objectStore.delete(key); },
    };
  }

  let result: T;
  try {
    result = await callback(stores);
  } catch (error) {
    done.catch(() => {
      // The abort below rejects `done`; the callback's error is the one worth reporting.
    });
    try {
      transaction.abort();
    } catch {
      // Already committed or aborted (InvalidStateError): nothing left to roll back.
    }
    throw error;
  }

  await done;
  notifyOtherTabs();
  return result;
}

export async function batchPut(operations: BatchOperation[]): Promise<void> {
  const db = await getDB();
  const storeNames = [...new Set(operations.map(operation => operation.store))];
  const transaction = db.transaction(storeNames, 'readwrite');
  const done = waitForTransaction(transaction);
  for (const operation of operations) {
    transaction.objectStore(operation.store).put(operation.data);
  }
  await done;
  notifyOtherTabs();
}

export const api = {
  rooms: {
    getAll: () => getAll<Room>('rooms'),
    getById: (id: string) => getById<Room>('rooms', id),
    create: (room: Room) => put('rooms', room),
    update: (id: string, data: Partial<Room>) => updateById<Room>('rooms', id, data),
    delete: (id: string) => deleteById('rooms', id),
  },
  guests: {
    getAll: () => getAll<Guest>('guests'),
    getById: (id: string) => getById<Guest>('guests', id),
    create: (guest: Guest) => put('guests', guest),
    update: (id: string, data: Partial<Guest>) => updateById<Guest>('guests', id, data),
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
    update: (id: string, data: Partial<Reservation>) => updateById<Reservation>('reservations', id, data),
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
        .then(existing => put('settings', { id: 'property', name: 'My Property', isConfigured: false, ...existing, ...data })),
  },
};
