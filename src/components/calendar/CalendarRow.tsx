import { format, addDays } from 'date-fns';
import { type Room } from '../../domain/Room';
import { type Reservation } from '../../domain/Reservation';
import { type Guest } from '../../domain/Guest';

interface CalendarRowProps {
  room: Room;
  reservations: Reservation[];
  guests: Guest[];
  weekStart: Date;
  days: Date[];
  onReservationClick?: (reservation: Reservation) => void;
}

export default function CalendarRow({ room, reservations, guests, weekStart, days, onReservationClick }: CalendarRowProps) {
  const roomReservations = reservations.filter(r => r.roomId === room.id);

  return (
    <div className="flex min-h-[80px]">
      <div className="w-20 flex-shrink-0 border-r border-ios-border/40 p-3 flex flex-col justify-center bg-ios-bg/30">
        <span className="text-sm font-semibold text-ios-text leading-tight">{room.name}</span>
      </div>
      <div className="flex-1 relative">
        {roomReservations.map(res => {
          const guest = guests.find(g => g.id === res.guestId);

          const startIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === res.arrivalDate);
          const endIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === res.departureDate);

          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(addDays(weekStart, 7), 'yyyy-MM-dd');
          if (res.departureDate <= weekStartStr || res.arrivalDate >= weekEndStr) return null;

          const actualStart = startIdx === -1 ? 0 : startIdx;
          const actualEnd = endIdx === -1 ? 7 : endIdx;
          const span = actualEnd - actualStart;
          if (span <= 0) return null;

          const barColor = res.status === 'Checked In' ? 'bg-ios-green/15 border-ios-green/30'
            : res.status === 'Checked Out' ? 'bg-ios-orange/15 border-ios-orange/30'
            : res.status === 'Cancelled' ? 'bg-ios-red/15 border-ios-red/30'
            : 'bg-ios-blue/15 border-ios-blue/30';

          const textColor = res.status === 'Checked In' ? 'text-ios-green'
            : res.status === 'Checked Out' ? 'text-ios-orange'
            : res.status === 'Cancelled' ? 'text-ios-red'
            : 'text-ios-blue';

          return (
            <div
              key={res.id}
              onClick={() => onReservationClick?.(res)}
              className={`absolute top-2 bottom-2 rounded-xl ${barColor} border px-3 py-1 overflow-hidden flex items-center cursor-pointer active:scale-[0.98] transition-transform`}
              style={{
                left: `${(actualStart / 7) * 100}%`,
                width: `${(span / 7) * 100}%`,
                marginLeft: '4px',
                marginRight: '4px'
              }}
            >
              <div className={`text-xs font-semibold ${textColor} truncate`}>{guest?.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
