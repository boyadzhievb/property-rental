import {
  exportBackup,
  importBackup,
  type BackupData,
  type ImportReport,
} from '../api/client';

export type { BackupData, ImportReport };

interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupData;
}

export class BackupService {
  async export(): Promise<BackupData> {
    return exportBackup();
  }

  async import(data: BackupData): Promise<ImportReport> {
    return importBackup(data);
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
