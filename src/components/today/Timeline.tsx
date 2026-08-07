import { type Reservation } from '../../domain/Reservation';
import { type Room } from '../../domain/Room';
import { type Guest } from '../../domain/Guest';

interface TimelineEvent {
  type: string;
  reservation: Reservation;
  time: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  rooms: Room[];
  guests: Guest[];
}

export default function Timeline({ events, rooms, guests }: TimelineProps) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Today's Schedule</h3>
      <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
        {events.length === 0 ? (
          <div className="p-8 text-center text-ios-text-secondary">
            No events scheduled for today.
          </div>
        ) : (
          <div className="divide-y divide-ios-border/40">
            {events.map((event, i) => {
              const guest = guests.find(g => g.id === event.reservation.guestId);
              const room = rooms.find(r => r.id === event.reservation.roomId);
              const isArrival = event.type === 'Arrival';

              return (
                <div key={i} className="flex items-center p-4">
                  <div className="flex-shrink-0 w-16 text-right mr-4">
                    <div className="font-medium text-ios-text">{event.time}</div>
                    <div className={`text-xs font-semibold ${isArrival ? 'text-ios-blue' : 'text-ios-orange'}`}>
                      {event.type}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ios-text truncate">{guest?.name}</div>
                    <div className="text-sm text-ios-text-secondary truncate">{room?.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
