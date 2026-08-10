interface FormErrors {
  guestName?: string;
  phone?: string;
  email?: string;
}

interface GuestInfoStepProps {
  guestName: string;
  phone: string;
  email: string;
  errors: FormErrors;
  onUpdate: (field: string, value: string) => void;
}

export default function GuestInfoStep({ guestName, phone, email, errors, onUpdate }: GuestInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Guest Information</div>
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
