/**
 * The data layer's single entry point: repositories and services import from here, never from
 * the modules behind it.
 *
 * - `db.ts`     connection, schema migrations, transaction helper
 * - `crud.ts`   per-store reads/writes, atomic transactions, the `api` object
 * - `seed.ts`   demo data, first-run setup, reset
 * - `backup.ts` raw backup export/import
 * - `sync.ts`   change announcements, same tab and across tabs
 */
export { waitForTransaction, type PropertySettings, type StoreName } from './db';
export { onDataChange, type ChangeHandler } from './sync';
export { api, atomicReadWrite, batchPut, type BatchOperation, type StoreAccessor } from './crud';
export { seedDemoData, configureProperty, resetData } from './seed';
export { exportBackup, importBackup, type BackupData, type BackupPreferences } from './backup';
