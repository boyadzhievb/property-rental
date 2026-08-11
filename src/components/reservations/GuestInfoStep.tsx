import { useState } from 'react';
import { Check, Search, UserPlus } from 'lucide-react';
import { type Guest } from '../../domain/Guest';

interface FormErrors {
  guestId?: string;
  guestName?: string;
  phone?: string;
  email?: string;
}

interface GuestInfoStepProps {
  guests: Guest[];
  selectedGuestId: string;
  isNewGuest: boolean;
  guestName: string;
  phone: string;
  email: string;
  errors: FormErrors;
  onSelectGuest: (guestId: string) => void;
  onToggleNewGuest: () => void;
  onUpdate: (field: string, value: string) => void;
}

export default function GuestInfoStep({ guests, selectedGuestId, isNewGuest, guestName, phone, email, errors, onSelectGuest, onToggleNewGuest, onUpdate }: GuestInfoStepProps) {
  const [search, setSearch] = useState('');

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isNewGuest) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between ml-4 mr-4 mb-2">
            <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold">New Guest</div>
            <button onClick={onToggleNewGuest} className="text-xs text-ios-blue font-medium">Select Existing</button>
          </div>
          <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
            <div>
              <input
                type="text"
                placeholder="Guest Name"
                value={guestName}
                onChange={(e) => onUpdate('guestName', e.target.value)}
                className="w-full p-4 border-b border-ios-border/40 focus:outline-none bg-transparent text-ios-text placeholder-ios-text-secondary"
                autoFocus
              />
              {errors.guestName && <div className="px-4 pb-2 text-xs text-ios-red">{errors.guestName}</div>}
            </div>
            <div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => onUpdate('phone', e.target.value)}
                className="w-full p-4 border-b border-ios-border/40 focus:outline-none bg-transparent text-ios-text placeholder-ios-text-secondary"
              />
              {errors.phone && <div className="px-4 pb-2 text-xs text-ios-red">{errors.phone}</div>}
            </div>
            <div>
              <input
                type="email"
                placeholder="Email (Optional)"
                value={email}
                onChange={(e) => onUpdate('email', e.target.value)}
                className="w-full p-4 focus:outline-none bg-transparent text-ios-text placeholder-ios-text-secondary"
              />
              {errors.email && <div className="px-4 pb-2 text-xs text-ios-red">{errors.email}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between ml-4 mr-4 mb-2">
          <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold">Select Guest</div>
          <button onClick={onToggleNewGuest} className="text-xs text-ios-blue font-medium flex items-center gap-1">
            <UserPlus size={12} /> New Guest
          </button>
        </div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
          <div className="flex items-center px-4 py-3 border-b border-ios-border/40">
            <Search size={16} className="text-ios-text-secondary mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search guests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full focus:outline-none bg-transparent text-ios-text placeholder-ios-text-secondary"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-ios-border/40">
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-ios-text-secondary text-center">No guests found</div>
            )}
            {filtered.map(guest => (
              <button
                key={guest.id}
                onClick={() => onSelectGuest(guest.id)}
                className="w-full flex items-center justify-between p-4 text-left active:bg-ios-gray-light/50 transition-colors"
              >
                <div>
                  <div className="text-ios-text font-medium">{guest.name}</div>
                  <div className="text-xs text-ios-text-secondary">{guest.phone}{guest.email ? ` · ${guest.email}` : ''}</div>
                </div>
                {selectedGuestId === guest.id && <Check size={18} className="text-ios-blue shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        {errors.guestId && <div className="px-4 pt-2 text-xs text-ios-red">{errors.guestId}</div>}
      </div>
    </div>
  );
}
