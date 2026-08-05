import { useState, useRef } from 'react';
import { Home, Upload } from 'lucide-react';
import { type BackupData } from '../api/client';

interface SetupViewProps {
  onConfigure: (name: string, roomCount: number) => void;
  onSeedData: () => void;
  onImport: (data: BackupData) => void;
}

export default function SetupView({ onConfigure, onSeedData, onImport }: SetupViewProps) {
  const [configName, setConfigName] = useState('Villa Blanca');
  const [configRooms, setConfigRooms] = useState(4);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        if (!data.rooms && !data.guests && !data.reservations) {
          setImportError('Invalid backup file format.');
          return;
        }
        setImportError('');
        onImport(data);
      } catch {
        setImportError('Could not read file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-5 pt-20 flex flex-col items-center justify-center min-h-[80vh] text-center max-w-sm mx-auto">
      <div className="w-20 h-20 bg-ios-blue text-white rounded-3xl flex items-center justify-center mb-6 shadow-lg">
        <Home size={40} />
      </div>
      <h1 className="text-3xl font-bold text-ios-text mb-2">Welcome</h1>
      <p className="text-ios-text-secondary mb-10">Let&apos;s set up your property.</p>

      <div className="w-full bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04] mb-6 space-y-4 text-left">
        <div>
          <label className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-2 mb-1 block">Property Name</label>
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            className="w-full p-4 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-2 mb-1 block">Number of Rooms</label>
          <input
            type="number"
            min="1"
            value={configRooms}
            onChange={(e) => setConfigRooms(Number(e.target.value))}
            className="w-full p-4 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
          />
        </div>
        <button
          onClick={() => onConfigure(configName, configRooms)}
          className="w-full bg-ios-blue text-white font-semibold py-4 rounded-xl active:opacity-70 mt-2"
        >
          Configure App
        </button>
      </div>

      <div className="relative w-full my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ios-border/40"></div></div>
        <div className="relative bg-ios-bg px-4 text-sm text-ios-text-secondary font-medium">OR</div>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-ios-card text-ios-text font-semibold py-4 rounded-xl active:opacity-70 border border-black/[0.04] shadow-sm flex items-center justify-center gap-2 mb-4"
      >
        <Upload size={20} className="text-ios-blue" />
        Import Backup
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      {importError && (
        <p className="text-ios-red text-sm mb-4">{importError}</p>
      )}

      <button
        onClick={onSeedData}
        className="w-full bg-ios-gray-light text-ios-blue font-semibold py-4 rounded-xl active:opacity-70"
      >
        Seed with Demo Data
      </button>
    </div>
  );
}
