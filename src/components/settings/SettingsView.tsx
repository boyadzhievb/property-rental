import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Cloud, RotateCcw, Palette, Check } from 'lucide-react';
import { usePropertyContext } from '../../context/PropertyContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { SettingsGroup, SettingsItem } from '../ui/SettingsGroup';
import PageHeader from '../layout/PageHeader';

const THEME_LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };

export default function SettingsView() {
  const { propertyName, updateName, resetData } = usePropertyContext();
  const { mode, setMode } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(propertyName);
  const [showThemePicker, setShowThemePicker] = useState(false);

  return (
    <div className="pb-24">
      <PageHeader title="Settings" />

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
              <div className="text-sm text-ios-text-secondary">Owner Account</div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsItem icon={SettingsIcon} label="Property Details" color="bg-ios-gray" />
          <SettingsItem icon={Bell} label="Notifications" color="bg-ios-red" />
          <div onClick={() => setShowThemePicker(!showThemePicker)}>
            <SettingsItem icon={Palette} label="Appearance" color="bg-ios-blue" value={THEME_LABELS[mode]} />
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
        </SettingsGroup>

        <SettingsGroup title="Data">
          <SettingsItem icon={Cloud} label="Backup & Restore" color="bg-ios-blue" value="Yesterday" />
          <div onClick={() => { if (confirm('This will download a backup and then erase all data. Continue?')) resetData(); }}>
            <SettingsItem icon={RotateCcw} label="Reset Data" color="bg-ios-red" />
          </div>
        </SettingsGroup>
      </div>
    </div>
  );
}
