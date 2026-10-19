import { exportBackup, importBackup, type BackupData, type ImportReport } from '../api/client';

export class BackupRepository {
  async exportAll(): Promise<BackupData> {
    return exportBackup();
  }

  async importAll(data: BackupData): Promise<ImportReport> {
    return importBackup(data);
  }
}

export const backupRepository = new BackupRepository();
