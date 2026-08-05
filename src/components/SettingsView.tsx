import { useState } from 'react';
import { ChevronRight, Settings as SettingsIcon, Bell, Cloud, RotateCcw, Palette, Check } from 'lucide-react';
import { usePropertyContext } from '../context/PropertyContext';

export default function SettingsView() {
  const { propertyName, updateName, resetData } = usePropertyContext();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(propertyName);
  const Group = ({ children, title }: { children: React.ReactNode, title?: string }) => (
    <div className="mb-6">
      {title && <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">{title}</div>}
      <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
        <div className="divide-y divide-ios-border/40">
          {children}
        </div>
      </div>
    </div>
  );

  const Item = ({ icon: Icon, label, color = 'bg-ios-blue', value }: any) => (
    <div className="flex items-center p-4 active:bg-ios-gray-light/30 transition-colors cursor-pointer">
      <div className={`w-8 h-8 rounded-lg ${color} text-white flex items-center justify-center mr-4`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 font-medium text-ios-text">{label}</div>
      {value && <div className="text-ios-text-secondary mr-2">{value}</div>}
      <ChevronRight className="text-ios-border" size={20} />
    </div>
  );

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-6 bg-ios-bg sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-ios-text">Settings</h1>
      </header>

      <div className="px-5 max-w-screen-md mx-auto">
        <Group>
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
            {!editing && <ChevronRight className="text-ios-border" size={20} />}
          </div>
        </Group>

        <Group title="Preferences">
          <Item icon={SettingsIcon} label="Property Details" color="bg-ios-gray" />
          <Item icon={Bell} label="Notifications" color="bg-ios-red" />
          <Item icon={Palette} label="Appearance" color="bg-ios-blue" value="Light" />
        </Group>

        <Group title="Data">
          <Item icon={Cloud} label="Backup & Restore" color="bg-ios-blue" value="Yesterday" />
          <div onClick={() => { if (confirm('This will download a backup and then erase all data. Continue?')) resetData(); }}>
            <Item icon={RotateCcw} label="Reset Data" color="bg-ios-red" />
          </div>
        </Group>
      </div>
    </div>
  );
}
