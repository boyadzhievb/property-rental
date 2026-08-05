import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, seedDemoData, configureProperty, importBackup, exportBackup, resetData as resetDataDb, type BackupData } from '../api/client';

interface PropertyContextValue {
  propertyName: string;
  isConfigured: boolean;
  loading: boolean;
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

  useEffect(() => {
    api.settings.getProperty().then((s) => {
      setPropertyName(s.name);
      setIsConfigured(s.isConfigured);
      setLoading(false);
    });
  }, []);

  const updateName = useCallback(async (name: string) => {
    await api.settings.saveProperty({ name });
    setPropertyName(name);
  }, []);

  const configureApp = useCallback(async (name: string, roomCount: number) => {
    await configureProperty(name, roomCount);
    setPropertyName(name || 'My Property');
    setIsConfigured(true);
  }, []);

  const seedData = useCallback(async () => {
    await seedDemoData();
    setPropertyName('Villa Blanca');
    setIsConfigured(true);
  }, []);

  const importData = useCallback(async (data: BackupData) => {
    await importBackup(data);
    setPropertyName(data.settings?.name || 'My Property');
    setIsConfigured(true);
  }, []);

  const resetData = useCallback(async () => {
    const backup = await exportBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `property-backup-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    await resetDataDb();
    setPropertyName('My Property');
    setIsConfigured(false);
  }, []);

  return (
    <PropertyContext.Provider value={{ propertyName, isConfigured, loading, updateName, configureApp, seedData, importData, resetData }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('usePropertyContext must be used within PropertyProvider');
  return context;
}
