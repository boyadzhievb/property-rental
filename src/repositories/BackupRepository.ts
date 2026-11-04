import { exportBackup, importBackup, type BackupData } from '../api/client';

export class BackupRepository {
  async exportAll(): Promise<BackupData> {
    return exportBackup();
  }

  /** Replace all data with already-validated records. */
  async importAll(data: BackupData): Promise<void> {
    return importBackup(data);
  }
}

export const backupRepository = new BackupRepository();
