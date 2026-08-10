import { useMemo } from 'react';
import { format } from 'date-fns';
import { useRoomContext } from '../context/RoomContext';
import { useGuestContext } from '../context/GuestContext';
import { useReservationContext } from '../context/ReservationContext';
import { type Room, RoomStatus } from '../domain/Room';
import { type Guest } from '../domain/Guest';
import { type Reservation } from '../domain/Reservation';

export interface TodayData {
  arrivals: Reservation[];
  departures: Reservation[];
  occupiedCount: number;
  cleaningCount: number;
  timeline: { type: string; reservation: Reservation; time: string }[];
  rooms: Room[];
  guests: Guest[];
}

export function useToday() {
  const { rooms, loading: roomsLoading } = useRoomContext();
  const { guests } = useGuestContext();
  const { reservations, loading: resLoading } = useReservationContext();

  const loading = roomsLoading || resLoading;

  const data = useMemo<TodayData | null>(() => {
    if (loading) return null;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const arrivals = reservations.filter(r => r.arrivalDate === todayStr);
    const departures = reservations.filter(r => r.departureDate === todayStr);

    const timeline = [
      ...arrivals.map(r => ({ type: 'Arrival', reservation: r, time: '14:00' })),
      ...departures.map(r => ({ type: 'Departure', reservation: r, time: '11:00' })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    return {
      arrivals,
      departures,
      occupiedCount: rooms.filter(r => r.status === RoomStatus.OCCUPIED).length,
      cleaningCount: rooms.filter(r => r.status === RoomStatus.CLEANING).length,
      rooms,
      guests,
      timeline,
    };
  }, [rooms, guests, reservations, loading]);

  return { data, loading, error: null };
}
