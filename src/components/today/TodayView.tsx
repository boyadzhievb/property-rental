import { useState } from 'react';
import { LogIn, LogOut, Home, SprayCan } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { usePropertyContext } from '../../context/PropertyContext';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { useLocale } from '../../context/LocaleContext';
import { reservationService } from '../../services/ReservationService';
import { RoomStatus } from '../../domain/Room';
import PageHeader from '../layout/PageHeader';
import StatCard from '../ui/StatCard';

type StatFilter = 'arrivals' | 'departures' | 'occupied' | 'cleaning' | null;

export default function TodayView() {
  const { data, loading } = useToday();
  const { propertyName } = usePropertyContext();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const { t } = useLocale();
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const today = new Date();
  const localDate = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const toggleFilter = (filter: StatFilter) => {
    setActiveFilter(prev => prev === filter ? null : filter);
  };

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

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title={propertyName} subtitle={localDate} />
        <div className="px-5 text-center text-ios-text-secondary py-12">{t.loading}</div>
      </div>
    );
  }

  const occupiedRooms = data.rooms.filter(r => r.status === RoomStatus.OCCUPIED);
  const cleaningRooms = data.rooms.filter(r => r.status === RoomStatus.CLEANING);

  const filteredTimeline = activeFilter === 'arrivals'
    ? data.timeline.filter(e => e.type === 'Arrival')
    : activeFilter === 'departures'
    ? data.timeline.filter(e => e.type === 'Departure')
    : activeFilter === null
    ? data.timeline
    : [];

  const scheduleTitle = activeFilter === 'arrivals' ? t.todaysArrivals
    : activeFilter === 'departures' ? t.todaysDepartures
    : activeFilter === 'occupied' ? t.occupiedRooms
    : activeFilter === 'cleaning' ? t.roomsBeingCleaned
    : t.todaysSchedule;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'Confirmed': return t.confirmed;
      case 'Checked In': return t.checkedIn;
      case 'Checked Out': return t.checkedOut;
      case 'Cancelled': return t.cancelled;
      default: return status;
    }
  };

  const eventTypeLabel = (eventType: string) => {
    return eventType === 'Arrival' ? t.arrival : t.departure;
  };

  return (
    <div className="pb-24">
      <PageHeader title={propertyName} subtitle={localDate} />

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={<LogIn size={24} className="text-ios-blue" />}
            value={data.arrivals.length}
            label={t.arrivals}
            active={activeFilter === 'arrivals'}
            onClick={() => toggleFilter('arrivals')}
          />
          <StatCard
            icon={<LogOut size={24} className="text-ios-orange" />}
            value={data.departures.length}
            label={t.departures}
            active={activeFilter === 'departures'}
            onClick={() => toggleFilter('departures')}
          />
          <StatCard
            icon={<Home size={24} className="text-ios-red" />}
            value={occupiedRooms.length}
            label={t.occupied}
            active={activeFilter === 'occupied'}
            onClick={() => toggleFilter('occupied')}
          />
          <StatCard
            icon={<SprayCan size={24} className="text-ios-green" />}
            value={cleaningRooms.length}
            label={t.cleaning}
            active={activeFilter === 'cleaning'}
            onClick={() => toggleFilter('cleaning')}
          />
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">{scheduleTitle}</h3>
          <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">

            {(activeFilter === null || activeFilter === 'arrivals' || activeFilter === 'departures') && (
              filteredTimeline.length === 0 ? (
                <div className="p-8 text-center text-ios-text-secondary">
                  {activeFilter === 'arrivals' ? t.noArrivalsToday :
                   activeFilter === 'departures' ? t.noDeparturesToday :
                   t.noEventsToday}
                </div>
              ) : (
                <div className="divide-y divide-ios-border/40">
                  {filteredTimeline.map((event, i) => {
                    const guest = data.guests.find(g => g.id === event.reservation.guestId);
                    const room = data.rooms.find(r => r.id === event.reservation.roomId);
                    const isArrival = event.type === 'Arrival';
                    const isDeparture = event.type === 'Departure';
                    const canCheckIn = isArrival && event.reservation.status === 'Confirmed';
                    const canCheckOut = isDeparture && event.reservation.status === 'Checked In';

                    return (
                      <div key={i} className="flex items-center p-4">
                        <div className="flex-shrink-0 w-16 text-right mr-4">
                          <div className="font-medium text-ios-text">{event.time}</div>
                          <div className={`text-xs font-semibold ${
                            event.reservation.status === 'Checked In' ? 'text-ios-green' :
                            event.reservation.status === 'Checked Out' ? 'text-ios-orange' :
                            isArrival ? 'text-ios-blue' : 'text-ios-orange'
                          }`}>
                            {event.reservation.status === 'Confirmed'
                              ? eventTypeLabel(event.type)
                              : statusLabel(event.reservation.status)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ios-text truncate">{guest?.name}</div>
                          <div className="text-sm text-ios-text-secondary truncate">{room?.name}</div>
                        </div>

                        {canCheckIn && (
                          <button
                            onClick={() => handleCheckIn(event.reservation.id)}
                            disabled={loadingId === event.reservation.id}
                            className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-blue text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                          >
                            <LogIn size={14} />
                            {t.checkIn}
                          </button>
                        )}

                        {canCheckOut && (
                          <button
                            onClick={() => handleCheckOut(event.reservation.id)}
                            disabled={loadingId === event.reservation.id}
                            className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-orange text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                          >
                            <LogOut size={14} />
                            {t.checkOut}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeFilter === 'occupied' && (
              occupiedRooms.length === 0 ? (
                <div className="p-8 text-center text-ios-text-secondary">{t.noOccupiedRooms}</div>
              ) : (
                <div className="divide-y divide-ios-border/40">
                  {occupiedRooms.map(room => {
                    const res = data.arrivals.find(r => r.roomId === room.id && r.status === 'Checked In')
                      || data.departures.find(r => r.roomId === room.id && r.status === 'Checked In');
                    const guest = res ? data.guests.find(g => g.id === res.guestId) : null;

                    return (
                      <div key={room.id} className="flex items-center p-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ios-text truncate">{room.name}</div>
                          {guest && (
                            <div className="text-sm text-ios-text-secondary truncate">{guest.name}</div>
                          )}
                          <div className="text-xs font-semibold mt-0.5 text-ios-red">{t.occupied}</div>
                        </div>
                        {res && (
                          <button
                            onClick={() => handleCheckOut(res.id)}
                            disabled={loadingId === res.id}
                            className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-ios-orange text-white text-sm font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                          >
                            <LogOut size={14} />
                            {t.checkOut}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeFilter === 'cleaning' && (
              cleaningRooms.length === 0 ? (
                <div className="p-8 text-center text-ios-text-secondary">{t.noRoomsCleaning}</div>
              ) : (
                <div className="divide-y divide-ios-border/40">
                  {cleaningRooms.map(room => (
                    <div key={room.id} className="flex items-center p-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text truncate">{room.name}</div>
                        <div className="text-xs font-semibold mt-0.5 text-ios-green">{t.cleaning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
