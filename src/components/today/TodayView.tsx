import { useState } from 'react';
import { LogIn, LogOut, Home, SprayCan } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { usePropertyContext } from '../../context/PropertyContext';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { reservationService } from '../../services/ReservationService';
import { RoomStatus } from '../../domain/Room';
import PageHeader from '../layout/PageHeader';
import StatCard from '../ui/StatCard';
import Timeline from './Timeline';

type StatFilter = 'arrivals' | 'departures' | 'occupied' | 'cleaning' | null;

export default function TodayView() {
  const { data, loading } = useToday();
  const { propertyName } = usePropertyContext();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
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
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
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

  return (
    <div className="pb-24">
      <PageHeader title={propertyName} subtitle={localDate} />

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={<LogIn size={24} className="text-ios-blue" />}
            value={data.arrivals.length}
            label="Arrivals"
            active={activeFilter === 'arrivals'}
            onClick={() => toggleFilter('arrivals')}
          />
          <StatCard
            icon={<LogOut size={24} className="text-ios-orange" />}
            value={data.departures.length}
            label="Departures"
            active={activeFilter === 'departures'}
            onClick={() => toggleFilter('departures')}
          />
          <StatCard
            icon={<Home size={24} className="text-ios-red" />}
            value={occupiedRooms.length}
            label="Occupied"
            active={activeFilter === 'occupied'}
            onClick={() => toggleFilter('occupied')}
          />
          <StatCard
            icon={<SprayCan size={24} className="text-ios-green" />}
            value={cleaningRooms.length}
            label="Cleaning"
            active={activeFilter === 'cleaning'}
            onClick={() => toggleFilter('cleaning')}
          />
        </div>

        {(activeFilter === null || activeFilter === 'arrivals' || activeFilter === 'departures') && (
          <Timeline
            events={filteredTimeline}
            rooms={data.rooms}
            guests={data.guests}
          />
        )}

        {activeFilter === 'occupied' && (
          <div>
            <h3 className="text-xl font-bold mb-4">Occupied Rooms</h3>
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              {occupiedRooms.length === 0 ? (
                <div className="p-8 text-center text-ios-text-secondary">No occupied rooms.</div>
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
                        </div>
                        {res && (
                          <button
                            onClick={() => handleCheckOut(res.id)}
                            disabled={loadingId === res.id}
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
        )}

        {activeFilter === 'cleaning' && (
          <div>
            <h3 className="text-xl font-bold mb-4">Rooms Being Cleaned</h3>
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              {cleaningRooms.length === 0 ? (
                <div className="p-8 text-center text-ios-text-secondary">No rooms being cleaned.</div>
              ) : (
                <div className="divide-y divide-ios-border/40">
                  {cleaningRooms.map(room => (
                    <div key={room.id} className="flex items-center p-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text truncate">{room.name}</div>
                      </div>
                      <div className="flex-shrink-0 ml-3 px-2.5 py-1 bg-ios-green/10 text-ios-green text-xs font-semibold rounded-full">
                        Cleaning
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
