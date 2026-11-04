import type { z } from 'zod';
import { backupRepository } from '../repositories/BackupRepository';
import type { BackupData } from '../api/client';
import { RoomSchema } from '../schemas/RoomSchema';
import { GuestSchema } from '../schemas/GuestSchema';
import { ReservationSchema } from '../schemas/ReservationSchema';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { TaskSchema } from '../schemas/TaskSchema';
import { BACKUP_SCHEMA_VERSION, BackupFileSchema, type BackupFile } from '../schemas/BackupSchema';

export type { BackupData, BackupFile };
export { BACKUP_SCHEMA_VERSION };

interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupFile;
}

export interface RecordCounts {
  rooms: number;
  guests: number;
  reservations: number;
  payments: number;
  tasks: number;
}

export interface SkippedRecord {
  index: number;
  id?: string;
  error: string;
}

export interface ImportReport {
  skipped: RecordCounts;
  skippedDetails: Record<keyof RecordCounts, SkippedRecord[]>;
  total: number;
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

export type BackupImportErrorCode = 'invalidFormat' | 'wouldEraseData' | 'invalidRecords';

const IMPORT_ERROR_MESSAGES: Record<BackupImportErrorCode, string> = {
  invalidFormat: 'Import refused: the file is not a valid backup',
  wouldEraseData: 'Import refused: the backup contains no rooms, guests or reservations and would erase existing data',
  invalidRecords: 'Import refused: the backup contains invalid records',
};

export class BackupImportError extends Error {
  readonly code: BackupImportErrorCode;

  constructor(code: BackupImportErrorCode, detail?: string) {
    super(detail ? `${IMPORT_ERROR_MESSAGES[code]}: ${detail}` : IMPORT_ERROR_MESSAGES[code]);
    this.name = 'BackupImportError';
    this.code = code;
  }
}

export interface ImportOptions {
  /** Import the valid records even when some records fail validation. */
  allowPartial?: boolean;
}

const RECORD_KEYS = ['rooms', 'guests', 'reservations', 'payments', 'tasks'] as const;

/** A parsed backup: settings/preferences cleaned, records split into valid (parsed) and skipped. */
interface ParsedBackup {
  data: BackupData;
  skippedDetails: ImportReport['skippedDetails'];
}

function parseRecords<Schema extends z.ZodType>(records: unknown[] | undefined, schema: Schema) {
  const valid: z.output<Schema>[] = [];
  const failures: SkippedRecord[] = [];
  (records ?? []).forEach((record, index) => {
    const result = schema.safeParse(record);
    if (result.success) {
      // Persist Zod's output, not the raw input, so unknown fields never reach the database.
      valid.push(result.data);
    } else {
      const id = typeof record === 'object' && record !== null && 'id' in record && typeof record.id === 'string' ? record.id : undefined;
      failures.push({ index, id, error: result.error.message });
    }
  });
  return { valid, failures };
}

function describeFormatError(error: z.ZodError): string {
  const key = String(error.issues[0]?.path[0] ?? '');
  if ((RECORD_KEYS as readonly string[]).includes(key)) return `Invalid format: "${key}" must be an array`;
  if (key === 'settings') return 'Invalid format: "settings" must be an object';
  if (key === 'schemaVersion') return 'Invalid format: "schemaVersion" must be a positive whole number';
  return 'Invalid backup file format';
}

function checkFormat(data: unknown): { backup: BackupFile } | { error: string } {
  if (data === null || typeof data !== 'object') {
    return { error: 'Invalid file: not a JSON object' };
  }
  if (Array.isArray(data)) {
    return { error: 'Invalid backup: file contains no recognizable data (rooms, guests, reservations, or settings)' };
  }

  const result = BackupFileSchema.safeParse(data);
  if (!result.success) return { error: describeFormatError(result.error) };

  const backup = result.data;
  if ((backup.schemaVersion ?? 1) > BACKUP_SCHEMA_VERSION) {
    return { error: 'Unsupported backup: it was created by a newer version of the app. Update the app and try again.' };
  }
  if (!backup.settings && RECORD_KEYS.every(key => backup[key] === undefined)) {
    return { error: 'Invalid backup: file contains no recognizable data (rooms, guests, reservations, or settings)' };
  }
  return { backup };
}

function parseBackup(data: unknown): ParsedBackup {
  const format = checkFormat(data);
  if ('error' in format) throw new BackupImportError('invalidFormat', format.error);
  const { backup } = format;

  const rooms = parseRecords(backup.rooms, RoomSchema);
  const guests = parseRecords(backup.guests, GuestSchema);
  const reservations = parseRecords(backup.reservations, ReservationSchema);
  const payments = parseRecords(backup.payments, PaymentSchema);
  const tasks = parseRecords(backup.tasks, TaskSchema);

  return {
    data: {
      schemaVersion: backup.schemaVersion ?? 1,
      settings: backup.settings,
      preferences: backup.preferences,
      rooms: rooms.valid,
      guests: guests.valid,
      reservations: reservations.valid,
      payments: payments.valid,
      tasks: tasks.valid,
    },
    skippedDetails: {
      rooms: rooms.failures,
      guests: guests.failures,
      reservations: reservations.failures,
      payments: payments.failures,
      tasks: tasks.failures,
    },
  };
}

function countRecords(data: BackupData): RecordCounts {
  return {
    rooms: data.rooms?.length ?? 0,
    guests: data.guests?.length ?? 0,
    reservations: data.reservations?.length ?? 0,
    payments: data.payments?.length ?? 0,
    tasks: data.tasks?.length ?? 0,
  };
}

function countCoreRecords(counts: RecordCounts): number {
  return counts.rooms + counts.guests + counts.reservations;
}

export class BackupService {
  async export(): Promise<BackupData> {
    return backupRepository.exportAll();
  }

  /**
   * Describe what importing `data` would do, without writing anything.
   * Throws BackupImportError('invalidFormat') when the file is not a valid backup.
   */
  async analyze(data: unknown): Promise<ImportPlan> {
    return this.plan(parseBackup(data));
  }

  /**
   * Replace all stored data with the backup. Refuses (throws BackupImportError) when the file is
   * malformed, when it would erase existing data, or when records are invalid and `allowPartial`
   * is not set. Only schema-parsed records, settings and preferences are written.
   */
  async import(data: unknown, options: ImportOptions = {}): Promise<ImportReport> {
    const parsed = parseBackup(data);
    const plan = await this.plan(parsed);
    if (plan.wouldEraseData) throw new BackupImportError('wouldEraseData');
    if (plan.skipped > 0 && !options.allowPartial) throw new BackupImportError('invalidRecords');

    await backupRepository.importAll(parsed.data);

    const skippedDetails = parsed.skippedDetails;
    const skipped: RecordCounts = {
      rooms: skippedDetails.rooms.length,
      guests: skippedDetails.guests.length,
      reservations: skippedDetails.reservations.length,
      payments: skippedDetails.payments.length,
      tasks: skippedDetails.tasks.length,
    };
    return { skipped, skippedDetails, total: plan.skipped };
  }

  validate(data: unknown): BackupValidationResult {
    const format = checkFormat(data);
    if ('error' in format) return { valid: false, error: format.error };
    return { valid: true, data: format.backup };
  }

  private async plan(parsed: ParsedBackup): Promise<ImportPlan> {
    const current = countRecords(await backupRepository.exportAll());
    const incoming = countRecords(parsed.data);
    const skipped = RECORD_KEYS.reduce((sum, key) => sum + parsed.skippedDetails[key].length, 0);
    return {
      current,
      incoming,
      skipped,
      wouldEraseData: countCoreRecords(incoming) === 0 && countCoreRecords(current) > 0,
    };
  }
}

export const backupService = new BackupService();
