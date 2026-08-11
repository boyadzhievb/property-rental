import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { reservationService } from '../../services/ReservationService';
import PageHeader from '../layout/PageHeader';
import CalendarRow from './CalendarRow';

export default function CalendarView() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const { data, loading, refresh: refreshCalendar } = useCalendar(weekStart);
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleCheckIn = async (id: string) => {
    setLoadingId(id);
    try {
      await reservationService.checkIn(id);
      await Promise.all([refreshCalendar(), refreshReservations(), refreshRooms()]);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title="Calendar" />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Calendar"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekStart(subDays(weekStart, 7))}
              className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-ios-text min-w-[120px] text-center">
              {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        }
      />

      <div className="px-5 space-y-6">
        <div className="bg-ios-card rounded-3xl shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="flex border-b border-ios-border/40">
            <div className="w-20 flex-shrink-0 border-r border-ios-border/40 p-3 bg-ios-bg/30"></div>
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className="flex-1 p-3 text-center border-r last:border-r-0 border-ios-border/40">
                  <div className="text-xs font-medium text-ios-text-secondary mb-1">{format(day, 'EEE')}</div>
                  <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-ios-blue text-white' : 'text-ios-text'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divide-y divide-ios-border/40">
            {data.rooms.map(room => (
              <CalendarRow
                key={room.id}
                room={room}
                reservations={data.reservations}
                guests={data.guests}
                weekStart={weekStart}
                days={days}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">Reservations</h3>
          <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
            {data.reservations.length === 0 ? (
              <div className="p-8 text-center text-ios-text-secondary">
                No reservations this week.
              </div>
            ) : (
              <div className="divide-y divide-ios-border/40">
                {data.reservations.map(res => {
                  const guest = data.guests.find(g => g.id === res.guestId);
                  const room = data.rooms.find(r => r.id === res.roomId);
                  const canCheckIn = res.status === 'Confirmed';

                  return (
                    <div key={res.id} className="flex items-center p-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text truncate">{guest?.name}</div>
                        <div className="text-sm text-ios-text-secondary truncate">
                          {room?.name} · {res.arrivalDate} → {res.departureDate}
                        </div>
                        <div className={`text-xs font-semibold mt-0.5 ${
                          res.status === 'Confirmed' ? 'text-ios-blue' :
                          res.status === 'Checked In' ? 'text-ios-green' :
                          res.status === 'Checked Out' ? 'text-ios-orange' :
                          'text-ios-red'
                        }`}>
                          {res.status}
                        </div>
                      </div>

                      {canCheckIn && (
                        <button
                          onClick={() => handleCheckIn(res.id)}
                          disabled={loadingId === res.id}
                          className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-blue text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                        >
                          <LogIn size={14} />
                          Check In
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
