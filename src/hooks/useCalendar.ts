import { useState, useEffect, useCallback } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useGuestContext } from '../context/GuestContext';
import { type Room } from '../domain/Room';
import { type Guest } from '../domain/Guest';
import { type Reservation } from '../domain/Reservation';
import { reservationService } from '../services/ReservationService';

export interface CalendarData {
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
}

export function useCalendar(month: Date) {
  const { rooms } = useRoomContext();
  const { guests } = useGuestContext();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reservationService.getReservations(month);
      setReservations(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month.getFullYear(), month.getMonth()]);

  useEffect(() => { refresh(); }, [refresh]);

  const data: CalendarData | null = loading ? null : { rooms, guests, reservations };

  return { data, loading, error, refresh };
}
