import { useState, useEffect, useCallback } from 'react';
import { type Reservation } from '../domain/Reservation';
import { reservationService } from '../services/ReservationService';

export function useReservation(id?: string) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setReservation(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await reservationService.getReservationById(id);
      setReservation(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const checkIn = useCallback(async () => {
    if (!id) return;
    await reservationService.checkIn(id);
    await refresh();
  }, [id, refresh]);

  const checkOut = useCallback(async () => {
    if (!id) return;
    await reservationService.checkOut(id);
    await refresh();
  }, [id, refresh]);

  const cancel = useCallback(async () => {
    if (!id) return;
    await reservationService.cancel(id);
    await refresh();
  }, [id, refresh]);

  return { reservation, loading, error, refresh, checkIn, checkOut, cancel };
}
