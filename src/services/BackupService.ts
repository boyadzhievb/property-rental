import { backupRepository } from '../repositories/BackupRepository';
import type { BackupData, ImportReport } from '../api/client';
import { RoomSchema } from '../schemas/RoomSchema';
import { GuestSchema } from '../schemas/GuestSchema';
import { ReservationSchema } from '../schemas/ReservationSchema';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { TaskSchema } from '../schemas/TaskSchema';

export type { BackupData, ImportReport };

interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupData;
}

export interface RecordCounts {
  rooms: number;
  guests: number;
  reservations: number;
  payments: number;
  tasks: number;
}

export interface ImportPlan {
  /** Records currently stored, all of which an import replaces. */
  current: RecordCounts;
  /** Records in the backup that pass schema validation. */
  incoming: RecordCounts;
  /** Records in the backup that fail schema validation and would be skipped. */
  skipped: number;
  /** True when the backup holds no rooms, guests or reservations but the database does. */
  wouldEraseData: boolean;
}

export type BackupImportErrorCode = 'wouldEraseData' | 'invalidRecords';

export class BackupImportError extends Error {
  readonly code: BackupImportErrorCode;

  constructor(code: BackupImportErrorCode) {
    super(code === 'wouldEraseData'
      ? 'Import refused: the backup contains no rooms, guests or reservations and would erase existing data'
      : 'Import refused: the backup contains invalid records');
    this.name = 'BackupImportError';
    this.code = code;
  }
}

export interface ImportOptions {
  /** Import the valid records even when some records fail validation. */
  allowPartial?: boolean;
}

function countValid(records: unknown[] | undefined, schema: { safeParse: (value: unknown) => { success: boolean } }) {
  const items = records ?? [];
  const valid = items.filter(item => schema.safeParse(item).success).length;
  return { valid, invalid: items.length - valid };
}

function countCoreRecords(counts: RecordCounts): number {
  return counts.rooms + counts.guests + counts.reservations;
}

export class BackupService {
  async export(): Promise<BackupData> {
    return backupRepository.exportAll();
  }

  /** Describe what importing `data` would do, without writing anything. */
  async analyze(data: BackupData): Promise<ImportPlan> {
    const existing = await backupRepository.exportAll();
    const current: RecordCounts = {
      rooms: existing.rooms?.length ?? 0,
      guests: existing.guests?.length ?? 0,
      reservations: existing.reservations?.length ?? 0,
      payments: existing.payments?.length ?? 0,
      tasks: existing.tasks?.length ?? 0,
    };

    const rooms = countValid(data.rooms, RoomSchema);
    const guests = countValid(data.guests, GuestSchema);
    const reservations = countValid(data.reservations, ReservationSchema);
    const payments = countValid(data.payments, PaymentSchema);
    const tasks = countValid(data.tasks, TaskSchema);

    const incoming: RecordCounts = {
      rooms: rooms.valid,
      guests: guests.valid,
      reservations: reservations.valid,
      payments: payments.valid,
      tasks: tasks.valid,
    };
    const skipped = rooms.invalid + guests.invalid + reservations.invalid + payments.invalid + tasks.invalid;

    return {
      current,
      incoming,
      skipped,
      wouldEraseData: countCoreRecords(incoming) === 0 && countCoreRecords(current) > 0,
    };
  }

  /**
   * Replace all stored data with the backup. Refuses (throws BackupImportError) when the
   * backup would erase existing data, or when records are invalid and `allowPartial` is not set.
   */
  async import(data: BackupData, options: ImportOptions = {}): Promise<ImportReport> {
    const plan = await this.analyze(data);
    if (plan.wouldEraseData) throw new BackupImportError('wouldEraseData');
    if (plan.skipped > 0 && !options.allowPartial) throw new BackupImportError('invalidRecords');
    return backupRepository.importAll(data);
  }

  validate(data: unknown): BackupValidationResult {
    if (data === null || typeof data !== 'object') {
      return { valid: false, error: 'Invalid file: not a JSON object' };
    }

    const record = data as Record<string, unknown>;

    if (record.rooms !== undefined && !Array.isArray(record.rooms)) {
      return { valid: false, error: 'Invalid format: "rooms" must be an array' };
    }
    if (record.guests !== undefined && !Array.isArray(record.guests)) {
      return { valid: false, error: 'Invalid format: "guests" must be an array' };
    }
    if (record.reservations !== undefined && !Array.isArray(record.reservations)) {
      return { valid: false, error: 'Invalid format: "reservations" must be an array' };
    }
    if (record.settings !== undefined && (typeof record.settings !== 'object' || record.settings === null)) {
      return { valid: false, error: 'Invalid format: "settings" must be an object' };
    }

    if (!record.rooms && !record.guests && !record.reservations && !record.settings) {
      return { valid: false, error: 'Invalid backup: file contains no recognizable data (rooms, guests, reservations, or settings)' };
    }

    return { valid: true, data: record as BackupData };
  }
}

export const backupService = new BackupService();
