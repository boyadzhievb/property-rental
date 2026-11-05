/**
 * Per-store reads and writes, atomic multi-store transactions, and the `api` object that
 * repositories use. Every successful write tells other tabs to refresh.
 */
import type { RoomData } from '../schemas/RoomSchema';
import type { GuestData } from '../schemas/GuestSchema';
import type { ReservationData } from '../schemas/ReservationSchema';
import type { PaymentData } from '../schemas/PaymentSchema';
import type { TaskData } from '../schemas/TaskSchema';
import { getDB, waitForTransaction, unconfiguredSettings, SETTINGS_KEY, type PropertySettings } from './db';
import { notifyOtherTabs } from './sync';

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return wrapRequest<T[]>(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return wrapRequest<T | undefined>(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
}

async function getByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
  const db = await getDB();
  return wrapRequest<T[]>(db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName).getAll(key));
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
    getAll: () => getAll<RoomData>('rooms'),
    getById: (id: string) => getById<RoomData>('rooms', id),
    create: (room: RoomData) => put('rooms', room),
    update: (id: string, data: Partial<RoomData>) => updateById<RoomData>('rooms', id, data),
    delete: (id: string) => deleteById('rooms', id),
  },
  guests: {
    getAll: () => getAll<GuestData>('guests'),
    getById: (id: string) => getById<GuestData>('guests', id),
    create: (guest: GuestData) => put('guests', guest),
    update: (id: string, data: Partial<GuestData>) => updateById<GuestData>('guests', id, data),
    delete: (id: string) => deleteById('guests', id),
  },
  reservations: {
    getAll: (params?: { from?: string; to?: string }) =>
      getAll<ReservationData>('reservations').then(all => {
        if (!params?.from || !params?.to) return all;
        return all.filter(r => r.departureDate >= params.from! && r.arrivalDate <= params.to!);
      }),
    getById: (id: string) => getById<ReservationData>('reservations', id),
    create: (reservation: ReservationData) => put('reservations', reservation),
    update: (id: string, data: Partial<ReservationData>) => updateById<ReservationData>('reservations', id, data),
    delete: (id: string) => deleteById('reservations', id),
  },
  payments: {
    getAll: () => getAll<PaymentData>('payments'),
    getByReservationId: (reservationId: string) =>
      getByIndex<PaymentData>('payments', 'reservationId', reservationId),
    getById: (id: string) => getById<PaymentData>('payments', id),
    create: (payment: PaymentData) => put('payments', payment),
    delete: (id: string) => deleteById('payments', id),
  },
  tasks: {
    getAll: () => getAll<TaskData>('tasks'),
    getByDate: (date: string) =>
      getByIndex<TaskData>('tasks', 'date', date),
    getById: (id: string) => getById<TaskData>('tasks', id),
    put: (task: TaskData) => put('tasks', task),
    delete: (id: string) => deleteById('tasks', id),
  },
  settings: {
    getProperty: (): Promise<PropertySettings> =>
      getById<PropertySettings>('settings', SETTINGS_KEY).then(s => s ?? unconfiguredSettings()),
    saveProperty: (data: Partial<PropertySettings>) =>
      getById<PropertySettings>('settings', SETTINGS_KEY)
        .then(existing => put('settings', { ...unconfiguredSettings(), ...existing, ...data })),
  },
};
