import { useState, useRef } from 'react';
import { Download, Upload, RotateCcw, Palette, Check, Globe } from 'lucide-react';
import { usePropertyContext } from '../../context/PropertyContext';
import { APP_VERSION } from '../../version';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { LOCALE_LABELS, type Locale } from '../../i18n';
import { useRoomContext } from '../../context/RoomContext';
import { useGuestContext } from '../../context/GuestContext';
import { useReservationContext } from '../../context/ReservationContext';
import { exportBackup, importBackup, type BackupData } from '../../api/client';
import { SettingsGroup, SettingsItem } from '../ui/SettingsGroup';
import PageHeader from '../layout/PageHeader';

function validateBackupFormat(data: unknown): { valid: boolean; error?: string; data?: BackupData } {
  if (data === null || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file: not a JSON object' };
  }

  const obj = data as Record<string, unknown>;

  if (obj.rooms !== undefined && !Array.isArray(obj.rooms)) {
    return { valid: false, error: 'Invalid format: "rooms" must be an array' };
  }
  if (obj.guests !== undefined && !Array.isArray(obj.guests)) {
    return { valid: false, error: 'Invalid format: "guests" must be an array' };
  }
  if (obj.reservations !== undefined && !Array.isArray(obj.reservations)) {
    return { valid: false, error: 'Invalid format: "reservations" must be an array' };
  }
  if (obj.settings !== undefined && (typeof obj.settings !== 'object' || obj.settings === null)) {
    return { valid: false, error: 'Invalid format: "settings" must be an object' };
  }

  if (!obj.rooms && !obj.guests && !obj.reservations && !obj.settings) {
    return { valid: false, error: 'Invalid backup: file contains no recognizable data (rooms, guests, reservations, or settings)' };
  }

  return { valid: true, data: obj as BackupData };
}

export default function SettingsView() {
  const { propertyName, updateName, resetData } = usePropertyContext();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const { refresh: refreshRooms } = useRoomContext();
  const { refresh: refreshGuests } = useGuestContext();
  const { refresh: refreshReservations } = useReservationContext();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(propertyName);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const THEME_LABELS: Record<ThemeMode, string> = { light: t.light, dark: t.dark, system: t.system };

  const handleBackup = async () => {
    try {
      const data = await exportBackup();
      const json = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `property-backup-${timestamp}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setRestoreStatus('Failed to export backup');
    }
  };

  const handleRestore = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setRestoreStatus('Error: file must be a .json file');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setRestoreStatus('Error: file is not valid JSON');
        e.target.value = '';
        return;
      }

      const result = validateBackupFormat(parsed);
      if (!result.valid) {
        setRestoreStatus(`Error: ${result.error}`);
        e.target.value = '';
        return;
      }

      await importBackup(result.data!);
      await Promise.all([refreshRooms(), refreshGuests(), refreshReservations()]);
      setRestoreStatus('Backup restored successfully');
    } catch {
      setRestoreStatus('Error: failed to restore backup');
    }

    e.target.value = '';
  };

  return (
    <div className="pb-24">
      <PageHeader title={t.settings} />

      <div className="px-5 max-w-screen-md mx-auto">
        <SettingsGroup>
          <div className="flex items-center p-4" onClick={() => { setEditing(true); setNameInput(propertyName); }}>
            <div className="w-16 h-16 rounded-full bg-ios-gray-light flex items-center justify-center text-2xl font-bold text-ios-text-secondary mr-4">
              {propertyName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateName(nameInput);
                        setEditing(false);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xl font-bold text-ios-text bg-transparent border-b-2 border-ios-blue outline-none w-full"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); updateName(nameInput); setEditing(false); }}
                    className="text-ios-blue"
                  >
                    <Check size={22} />
                  </button>
                </div>
              ) : (
                <div className="text-xl font-bold text-ios-text">{propertyName}</div>
              )}
              <div className="text-sm text-ios-text-secondary">{t.ownerAccount}</div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title={t.preferences}>
          <div onClick={() => setShowThemePicker(!showThemePicker)}>
            <SettingsItem icon={Palette} label={t.appearance} color="bg-ios-blue" value={THEME_LABELS[mode]} />
          </div>
          {showThemePicker && (
            <div className="px-4 py-3 flex gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map(option => (
                <button
                  key={option}
                  onClick={() => { setMode(option); setShowThemePicker(false); }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    mode === option
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray-light text-ios-text'
                  }`}
                >
                  {THEME_LABELS[option]}
                </button>
              ))}
            </div>
          )}

          <div onClick={() => setShowLanguagePicker(!showLanguagePicker)}>
            <SettingsItem icon={Globe} label={t.language} color="bg-ios-green" value={LOCALE_LABELS[locale]} />
          </div>
          {showLanguagePicker && (
            <div className="px-4 py-3 grid grid-cols-2 gap-2">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map(loc => (
                <button
                  key={loc}
                  onClick={() => { setLocale(loc); setShowLanguagePicker(false); }}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    locale === loc
                      ? 'bg-ios-green text-white'
                      : 'bg-ios-gray-light text-ios-text'
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          )}
        </SettingsGroup>

        <SettingsGroup title={t.data}>
          <div onClick={handleBackup}>
            <SettingsItem icon={Download} label={t.exportBackup} color="bg-ios-blue" />
          </div>
          <div onClick={handleRestore}>
            <SettingsItem icon={Upload} label={t.restoreBackup} color="bg-ios-green" />
          </div>
          <div onClick={() => { if (confirm(t.resetConfirm)) resetData(); }}>
            <SettingsItem icon={RotateCcw} label={t.resetData} color="bg-ios-red" />
          </div>
        </SettingsGroup>

        {restoreStatus && (
          <div className={`mt-4 px-4 py-3 rounded-2xl text-sm font-medium ${
            restoreStatus.startsWith('Error') ? 'bg-red-50 text-ios-red' : 'bg-green-50 text-green-700'
          }`}>
            {restoreStatus}
            <button onClick={() => setRestoreStatus(null)} className="float-right text-ios-text-secondary">✕</button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mt-8 text-center">
          <span className="text-xs text-ios-text-secondary font-mono">v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
