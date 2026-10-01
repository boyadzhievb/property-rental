import { Calendar, Check, Repeat } from 'lucide-react';
import { type Room } from '../../domain/Room';
import { type Reservation, type RecurrencePattern } from '../../domain/Reservation';
import { useLocale } from '../../context/LocaleContext';

interface FormErrors {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  price?: string;
  recurrenceEndDate?: string;
}

interface StayDetailsStepProps {
  rooms: Room[];
  reservations: Reservation[];
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  price: string;
  recurrencePattern: RecurrencePattern | '';
  recurrenceEndDate: string;
  occurrenceCount: number;
  errors: FormErrors;
  onUpdate: (field: string, value: string | number) => void;
}

export default function StayDetailsStep({ rooms, reservations, roomId, checkIn, checkOut, guestsCount, price, recurrencePattern, recurrenceEndDate, occurrenceCount, errors, onUpdate }: StayDetailsStepProps) {
  const { t } = useLocale();
  const occupiedDates = reservations
    .filter(r => r.roomId === roomId && r.isActive())
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">{t.stayDetails}</div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04] divide-y divide-ios-border/40">

          <div>
            <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold px-4 pt-3">{t.room}</div>
            <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => onUpdate('roomId', room.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    roomId === room.id
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray-light text-ios-text'
                  }`}
                >
                  {room.name}
                  {roomId === room.id && <Check size={14} className="inline ml-1" />}
                </button>
              ))}
            </div>
            {errors.roomId && <div id="error-roomId" role="alert" className="px-4 pb-2 text-xs text-ios-red">{errors.roomId}</div>}
          </div>

          {roomId && occupiedDates.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold mb-2">{t.occupiedDates}</div>
              <div className="space-y-1">
                {occupiedDates.map(r => (
                  <div key={r.id} className="text-sm text-ios-red font-medium">
                    {r.arrivalDate} → {r.departureDate}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col p-4 gap-3">
            <label className="flex justify-between items-center cursor-pointer min-h-[44px]">
              <span className="text-ios-text font-medium">{t.checkInDate}</span>
              <span className="flex items-center gap-2 bg-ios-gray-light rounded-xl px-3 py-2">
                <input
                  type="date"
                  aria-invalid={!!errors.checkIn}
                  aria-describedby={errors.checkIn ? 'error-checkIn' : undefined}
                  value={checkIn}
                  onChange={(e) => onUpdate('checkIn', e.target.value)}
                  className="text-ios-blue font-medium focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:outline-none bg-transparent"
                />
                <Calendar size={16} className="text-ios-blue flex-shrink-0" />
              </span>
            </label>
            {errors.checkIn && <div id="error-checkIn" className="text-xs text-ios-red">{errors.checkIn}</div>}
            <label className="flex justify-between items-center cursor-pointer min-h-[44px]">
              <span className="text-ios-text font-medium">{t.checkOutDate}</span>
              <span className="flex items-center gap-2 bg-ios-gray-light rounded-xl px-3 py-2">
                <input
                  type="date"
                  aria-invalid={!!errors.checkOut}
                  aria-describedby={errors.checkOut ? 'error-checkOut' : undefined}
                  value={checkOut}
                  onChange={(e) => onUpdate('checkOut', e.target.value)}
                  className="text-ios-blue font-medium focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:outline-none bg-transparent"
                />
                <Calendar size={16} className="text-ios-blue flex-shrink-0" />
              </span>
            </label>
            {errors.checkOut && <div id="error-checkOut" className="text-xs text-ios-red">{errors.checkOut}</div>}
          </div>

          <div className="flex justify-between items-center p-4">
            <span className="text-ios-text font-medium">{t.guestsCount}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onUpdate('guestsCount', Math.max(1, guestsCount - 1))}
                className="w-8 h-8 rounded-full bg-ios-gray-light flex items-center justify-center font-bold text-lg text-ios-blue active:opacity-70"
              >-</button>
              <span className="font-semibold text-lg w-4 text-center text-ios-text">{guestsCount}</span>
              <button
                onClick={() => onUpdate('guestsCount', guestsCount + 1)}
                className="w-8 h-8 rounded-full bg-ios-gray-light flex items-center justify-center font-bold text-lg text-ios-blue active:opacity-70"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">{t.totalPrice}</div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
          <input
            type="number"
            placeholder="$0.00"
            aria-label={t.totalPrice}
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? 'error-price' : undefined}
            value={price}
            onChange={(e) => onUpdate('price', e.target.value)}
            className="w-full p-4 focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:outline-none text-xl font-bold text-ios-text"
          />
          {errors.price && <div id="error-price" className="px-4 pb-3 text-xs text-ios-red">{errors.price}</div>}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2 flex items-center gap-1">
          <Repeat size={12} />
          {t.recurrence}
        </div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04] divide-y divide-ios-border/40">
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {(['', 'weekly', 'biweekly', 'monthly'] as const).map(pattern => {
              const labels: Record<string, string> = {
                '': t.recurrenceNone,
                weekly: t.recurrenceWeekly,
                biweekly: t.recurrenceBiweekly,
                monthly: t.recurrenceMonthly,
              };
              return (
                <button
                  key={pattern}
                  onClick={() => onUpdate('recurrencePattern', pattern)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    recurrencePattern === pattern
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray-light text-ios-text'
                  }`}
                >
                  {labels[pattern]}
                  {recurrencePattern === pattern && <Check size={14} className="inline ml-1" />}
                </button>
              );
            })}
          </div>

          {recurrencePattern && (
            <>
              <label className="flex justify-between items-center p-4 cursor-pointer min-h-[44px]">
                <span className="text-ios-text font-medium">{t.recurrenceEndDate}</span>
                <span className="flex items-center gap-2 bg-ios-gray-light rounded-xl px-3 py-2">
                  <input
                    type="date"
                    aria-invalid={!!errors.recurrenceEndDate}
                    aria-describedby={errors.recurrenceEndDate ? 'error-recurrenceEndDate' : undefined}
                    value={recurrenceEndDate}
                    onChange={(e) => onUpdate('recurrenceEndDate', e.target.value)}
                    className="text-ios-blue font-medium focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:outline-none bg-transparent"
                  />
                  <Calendar size={16} className="text-ios-blue flex-shrink-0" />
                </span>
              </label>
              {errors.recurrenceEndDate && (
                <div id="error-recurrenceEndDate" className="px-4 pb-3 text-xs text-ios-red">{errors.recurrenceEndDate}</div>
              )}
              {occurrenceCount > 0 && (
                <div className="px-4 py-3 text-sm text-ios-text-secondary">
                  <span className="font-semibold text-ios-blue">{occurrenceCount}</span> {t.recurrenceOccurrences}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
