/**
 * The IndexedDB connection: opening, schema migrations and the shared connection promise.
 * Everything else in `src/api/` reaches the database through `getDB()`.
 */

export interface PropertySettings {
  id: string;
  name: string;
  isConfigured: boolean;
  /** ISO 4217 code chosen at setup (see domain/currency). Missing for data from before currencies. */
  currency?: string;
}

const DB_NAME = 'property-rental';
const DB_VERSION = 5;

/** Every object store; whole-database operations (seed, reset, backup) span all of them. */
export const ALL_STORES = ['rooms', 'guests', 'reservations', 'payments', 'tasks', 'settings'] as const;

/** Stores holding entity records, i.e. everything except settings. */
export const ENTITY_STORES = ['rooms', 'guests', 'reservations', 'payments', 'tasks'] as const;

export const SETTINGS_KEY = 'property';
export const DEFAULT_SETTINGS_NAME = 'My Property';

/** Settings of a property that has not been set up yet. */
export function unconfiguredSettings(): PropertySettings {
  return { id: SETTINGS_KEY, name: DEFAULT_SETTINGS_NAME, isConfigured: false };
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
    const req = tx.objectStore('settings').get(SETTINGS_KEY);
    req.onsuccess = () => resolve(req.result);
  });

  if (existing) return;

  const seedTx = db.transaction('settings', 'readwrite');
  const done = waitForTransaction(seedTx);
  seedTx.objectStore('settings').put(unconfiguredSettings());
  await done;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** The shared connection, opened (and migrated) on first use. */
export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    requestPersistentStorage();
    dbPromise = openDB().then(async (db) => {
      await ensureSettings(db);
      return db;
    });
  }
  return dbPromise;
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
