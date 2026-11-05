import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { backupService, type BackupData } from '../services/BackupService';
import { useLocale } from './LocaleContext';
import { settingsService, DEFAULT_PROPERTY_NAME } from '../services/SettingsService';
import { dataChangeService } from '../services/DataChangeService';
import type { CurrencyCode } from '../domain/currency';
import { errorMessage } from '../i18n/errorMessage';

interface PropertyContextValue {
  propertyName: string;
  isConfigured: boolean;
  /** Display currency for all amounts. */
  currency: CurrencyCode;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  updateName: (name: string) => Promise<void>;
  /** Change the display currency; existing amounts are not converted. */
  updateCurrency: (currency: CurrencyCode) => Promise<void>;
  configureApp: (name: string, roomCount: number, currency: CurrencyCode) => Promise<void>;
  seedData: () => Promise<void>;
  importData: (data: BackupData) => Promise<void>;
  resetData: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [propertyName, setPropertyName] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(() => settingsService.detectCurrency());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocale();

  const clearError = useCallback(() => setError(null), []);

  // Only the most recent load may update state (settings can change in quick succession).
  const latestLoad = useRef(0);

  /** Load name, currency and setup state. Saves a currency guess if none is stored. */
  const loadSettings = useCallback(async () => {
    const loadId = ++latestLoad.current;
    try {
      const settings = await settingsService.getPropertySettings();
      if (loadId !== latestLoad.current) return;
      setPropertyName(settings.name);
      setIsConfigured(settings.isConfigured);
      setCurrency(settings.currency);
    } catch (e: unknown) {
      if (loadId !== latestLoad.current) return;
      console.error(e);
      setError(errorMessage(e, t, String));
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  // Setup, reset, restore or a rename in this tab or another one.
  useEffect(() => dataChangeService.subscribe(['settings'], () => { loadSettings(); }), [loadSettings]);

  const updateName = useCallback(async (name: string) => {
    try {
      await settingsService.saveName(name);
      setPropertyName(name);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  const updateCurrency = useCallback(async (nextCurrency: CurrencyCode) => {
    try {
      await settingsService.saveCurrency(nextCurrency);
      setCurrency(nextCurrency);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  const configureApp = useCallback(async (name: string, roomCount: number, chosenCurrency: CurrencyCode) => {
    try {
      const savedName = await settingsService.configureProperty(name, roomCount, chosenCurrency);
      setCurrency(chosenCurrency);
      setPropertyName(savedName);
      setIsConfigured(true);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  const seedData = useCallback(async () => {
    try {
      await settingsService.seedDemoData();
      setIsConfigured(true);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  const importData = useCallback(async (data: BackupData) => {
    try {
      // First-run import: nothing stored yet, so keep valid records even if some are skipped.
      await backupService.import(data, { allowPartial: true });
      setIsConfigured(true);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  const resetData = useCallback(async () => {
    let backup: BackupData;
    try {
      backup = await backupService.export();
    } catch (e: unknown) {
      console.error(e);
      setError(t.resetExportFailed);
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

    const confirmed = window.confirm(t.resetBackupStarted);
    if (!confirmed) return;

    try {
      await settingsService.resetAllData();
      setPropertyName(DEFAULT_PROPERTY_NAME);
      setCurrency(settingsService.detectCurrency());
      setIsConfigured(false);
    } catch (e: unknown) {
      console.error(e);
      setError(errorMessage(e, t, String));
    }
  }, [t]);

  return (
    <PropertyContext.Provider value={useMemo(() => ({ propertyName, isConfigured, currency, loading, error, clearError, updateName, updateCurrency, configureApp, seedData, importData, resetData }), [propertyName, isConfigured, currency, loading, error, clearError, updateName, updateCurrency, configureApp, seedData, importData, resetData])}>
      {children}
    </PropertyContext.Provider>
  );
}

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error('usePropertyContext must be used within PropertyProvider');
  return context;
}
