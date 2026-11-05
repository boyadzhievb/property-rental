/**
 * Raw backup export and import: every store plus the device preferences kept in localStorage.
 * Validation lives in BackupService; this module only reads and writes.
 */
import type { RoomData } from '../schemas/RoomSchema';
import type { GuestData } from '../schemas/GuestSchema';
import type { ReservationData } from '../schemas/ReservationSchema';
import type { PaymentData } from '../schemas/PaymentSchema';
import type { TaskData } from '../schemas/TaskSchema';
import { BACKUP_SCHEMA_VERSION } from '../schemas/BackupSchema';
import { getDB, waitForTransaction, ALL_STORES, ENTITY_STORES, SETTINGS_KEY, DEFAULT_SETTINGS_NAME, type PropertySettings } from './db';
import { announceChanges } from './sync';

export interface BackupPreferences {
  locale?: string;
  theme?: string;
  notificationsEnabled?: boolean;
}

export interface BackupData {
  schemaVersion?: number;
  settings?: Partial<Pick<PropertySettings, 'name' | 'currency'>>;
  rooms?: RoomData[];
  guests?: GuestData[];
  reservations?: ReservationData[];
  payments?: PaymentData[];
  tasks?: TaskData[];
  preferences?: BackupPreferences;
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDB();
  const tx = db.transaction([...ALL_STORES], 'readonly');

  const [rooms, guests, reservations, payments, tasks, settings] = await Promise.all([
    readRequest<RoomData[]>(tx.objectStore('rooms').getAll()),
    readRequest<GuestData[]>(tx.objectStore('guests').getAll()),
    readRequest<ReservationData[]>(tx.objectStore('reservations').getAll()),
    readRequest<PaymentData[]>(tx.objectStore('payments').getAll()),
    readRequest<TaskData[]>(tx.objectStore('tasks').getAll()),
    readRequest<PropertySettings | undefined>(tx.objectStore('settings').get(SETTINGS_KEY)),
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
 * Replace all stored records with `data` in one transaction, then announce one change for all
 * stores. Callers must pass records that were already validated and parsed (see
 * BackupService.import); nothing is validated here.
 */
export async function importBackup(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  const done = waitForTransaction(tx);

  for (const store of ENTITY_STORES) tx.objectStore(store).clear();

  for (const room of data.rooms ?? []) tx.objectStore('rooms').put(room);
  for (const guest of data.guests ?? []) tx.objectStore('guests').put(guest);
  for (const reservation of data.reservations ?? []) tx.objectStore('reservations').put(reservation);
  for (const payment of data.payments ?? []) tx.objectStore('payments').put(payment);
  for (const task of data.tasks ?? []) tx.objectStore('tasks').put(task);
  tx.objectStore('settings').put({
    id: SETTINGS_KEY,
    name: data.settings?.name ?? DEFAULT_SETTINGS_NAME,
    isConfigured: true,
    ...(data.settings?.currency ? { currency: data.settings.currency } : {}),
  });

  await done;
  announceChanges(ALL_STORES);

  if (data.preferences) {
    if (data.preferences.locale) localStorage.setItem('app-locale', data.preferences.locale);
    if (data.preferences.theme) localStorage.setItem('theme-mode', data.preferences.theme);
    if (data.preferences.notificationsEnabled !== undefined) {
      localStorage.setItem('notifications-enabled', String(data.preferences.notificationsEnabled));
    }
  }
}
