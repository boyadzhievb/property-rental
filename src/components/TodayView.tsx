import { format } from 'date-fns';
import { LogIn, LogOut, Home, SprayCan } from 'lucide-react';
import { useToday } from '../hooks/useToday';

export default function TodayView() {
  const { data, loading } = useToday();
  const today = new Date();

  if (loading || !data) {
    return (
      <div className="pb-24">
        <header className="px-5 pt-12 pb-6 bg-ios-bg sticky top-0 z-10">
          <h2 className="text-ios-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">
            {format(today, 'EEEE, MMMM d')}
          </h2>
          <h1 className="text-3xl font-bold text-ios-text">Villa Blanca</h1>
        </header>
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-6 bg-ios-bg sticky top-0 z-10">
        <h2 className="text-ios-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">
          {format(today, 'EEEE, MMMM d')}
        </h2>
        <h1 className="text-3xl font-bold text-ios-text">Villa Blanca</h1>
      </header>

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="text-ios-blue mb-2"><LogIn size={24} /></div>
            <div className="text-3xl font-bold mb-1">{data.arrivals.length}</div>
            <div className="text-ios-text-secondary font-medium">Arrivals</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="text-ios-orange mb-2"><LogOut size={24} /></div>
            <div className="text-3xl font-bold mb-1">{data.departures.length}</div>
            <div className="text-ios-text-secondary font-medium">Departures</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="text-ios-red mb-2"><Home size={24} /></div>
            <div className="text-3xl font-bold mb-1">{data.occupiedCount}</div>
            <div className="text-ios-text-secondary font-medium">Occupied</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="text-ios-green mb-2"><SprayCan size={24} /></div>
            <div className="text-3xl font-bold mb-1">{data.cleaningCount}</div>
            <div className="text-ios-text-secondary font-medium">Cleaning</div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">Today's Schedule</h3>
          <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
            {data.timeline.length === 0 ? (
              <div className="p-8 text-center text-ios-text-secondary">
                No events scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-ios-border/40">
                {data.timeline.map((event, i) => {
                  const guest = data.guests.find(g => g.id === event.reservation.guestId);
                  const room = data.rooms.find(r => r.id === event.reservation.roomId);
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
      </div>
    </div>
  );
}
