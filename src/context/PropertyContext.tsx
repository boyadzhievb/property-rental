import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, seedDemoData, configureProperty, importBackup, exportBackup, resetData as resetDataDb, type BackupData } from '../api/client';

interface PropertyContextValue {
  propertyName: string;
  isConfigured: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  updateName: (name: string) => Promise<void>;
  configureApp: (name: string, roomCount: number) => Promise<void>;
  seedData: () => Promise<void>;
  importData: (data: BackupData) => Promise<void>;
  resetData: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [propertyName, setPropertyName] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    api.settings.getProperty().then((s) => {
      setPropertyName(s.name);
      setIsConfigured(s.isConfigured);
      setLoading(false);
    }).catch((e: any) => {
      setError(e.message || 'Failed to load property settings');
      setLoading(false);
    });
  }, []);

  const updateName = useCallback(async (name: string) => {
    try {
      await api.settings.saveProperty({ name });
      setPropertyName(name);
    } catch (e: any) {
      setError(e.message || 'Failed to update property name');
    }
  }, []);

  const configureApp = useCallback(async (name: string, roomCount: number) => {
    try {
      await configureProperty(name, roomCount);
      setPropertyName(name || 'My Property');
      setIsConfigured(true);
    } catch (e: any) {
      setError(e.message || 'Failed to configure property');
    }
  }, []);

  const seedData = useCallback(async () => {
    try {
      await seedDemoData();
      setPropertyName('Villa Blanca');
      setIsConfigured(true);
    } catch (e: any) {
      setError(e.message || 'Failed to seed demo data');
    }
  }, []);

  const importData = useCallback(async (data: BackupData) => {
    try {
      await importBackup(data);
      setPropertyName(data.settings?.name || 'My Property');
      setIsConfigured(true);
    } catch (e: any) {
      setError(e.message || 'Failed to import backup');
    }
  }, []);

  const resetData = useCallback(async () => {
    let backup: BackupData;
    try {
      backup = await exportBackup();
    } catch {
      setError('Failed to export backup. Reset aborted.');
      return;
    }

    const json = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `property-backup-${timestamp}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const confirmed = window.confirm('Backup download started. Press OK to proceed with reset, or Cancel to abort.');
    if (!confirmed) return;

    try {
      await resetDataDb();
      setPropertyName('My Property');
      setIsConfigured(false);
    } catch (e: any) {
      setError(e.message || 'Failed to reset data');
    }
  }, []);

  return (
    <PropertyContext.Provider value={{ propertyName, isConfigured, loading, error, clearError, updateName, configureApp, seedData, importData, resetData }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('usePropertyContext must be used within PropertyProvider');
  return context;
}
