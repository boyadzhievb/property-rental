import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { type Reservation } from '../../domain/Reservation';
import { type Room } from '../../domain/Room';
import { type Guest } from '../../domain/Guest';
import { reservationService } from '../../services/ReservationService';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';

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
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCheckIn = async (id: string) => {
    setLoadingId(id);
    try {
      await reservationService.checkIn(id);
      await Promise.all([refreshReservations(), refreshRooms()]);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCheckOut = async (id: string) => {
    setLoadingId(id);
    try {
      await reservationService.checkOut(id);
      await Promise.all([refreshReservations(), refreshRooms()]);
    } finally {
      setLoadingId(null);
    }
  };

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
              const isDeparture = event.type === 'Departure';
              const canCheckIn = isArrival && event.reservation.status === 'Confirmed';
              const canCheckOut = isDeparture && event.reservation.status === 'Checked In';

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
                    <div className={`text-xs font-semibold mt-0.5 ${
                      event.reservation.status === 'Confirmed' ? 'text-ios-blue' :
                      event.reservation.status === 'Checked In' ? 'text-ios-green' :
                      event.reservation.status === 'Checked Out' ? 'text-ios-orange' :
                      'text-ios-red'
                    }`}>
                      {event.reservation.status}
                    </div>
                  </div>

                  {canCheckIn && (
                    <button
                      onClick={() => handleCheckIn(event.reservation.id)}
                      disabled={loadingId === event.reservation.id}
                      className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-blue text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                    >
                      <LogIn size={14} />
                      Check In
                    </button>
                  )}

                  {canCheckOut && (
                    <button
                      onClick={() => handleCheckOut(event.reservation.id)}
                      disabled={loadingId === event.reservation.id}
                      className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-orange text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                    >
                      <LogOut size={14} />
                      Check Out
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
