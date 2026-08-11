import { Check } from 'lucide-react';
import { type Room } from '../../domain/Room';
import { type Reservation } from '../../domain/Reservation';

interface FormErrors {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  price?: string;
}

interface StayDetailsStepProps {
  rooms: Room[];
  reservations: Reservation[];
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  price: string;
  errors: FormErrors;
  onUpdate: (field: string, value: string | number) => void;
}

export default function StayDetailsStep({ rooms, reservations, roomId, checkIn, checkOut, guestsCount, price, errors, onUpdate }: StayDetailsStepProps) {
  const occupiedDates = reservations
    .filter(r => r.roomId === roomId && r.isActive())
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Stay Details</div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04] divide-y divide-ios-border/40">

          <div>
            <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold px-4 pt-3">Room</div>
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
            {errors.roomId && <div className="px-4 pb-2 text-xs text-ios-red">{errors.roomId}</div>}
          </div>

          {roomId && occupiedDates.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold mb-2">Occupied Dates</div>
              <div className="space-y-1">
                {occupiedDates.map(r => (
                  <div key={r.id} className="text-sm text-ios-red font-medium">
                    {r.arrivalDate} → {r.departureDate}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-ios-text font-medium">Check-in</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => onUpdate('checkIn', e.target.value)}
                className="text-ios-blue text-right focus:outline-none bg-transparent"
              />
            </div>
            {errors.checkIn && <div className="text-xs text-ios-red mb-2">{errors.checkIn}</div>}
            <div className="flex justify-between items-center">
              <span className="text-ios-text font-medium">Check-out</span>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => onUpdate('checkOut', e.target.value)}
                className="text-ios-blue text-right focus:outline-none bg-transparent"
              />
            </div>
            {errors.checkOut && <div className="text-xs text-ios-red mt-2">{errors.checkOut}</div>}
          </div>

          <div className="flex justify-between items-center p-4">
            <span className="text-ios-text font-medium">Guests</span>
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
        <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Total Price</div>
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
          <input
            type="number"
            placeholder="$0.00"
            value={price}
            onChange={(e) => onUpdate('price', e.target.value)}
            className="w-full p-4 focus:outline-none text-xl font-bold text-ios-text"
          />
          {errors.price && <div className="px-4 pb-3 text-xs text-ios-red">{errors.price}</div>}
        </div>
      </div>
    </div>
  );
}
