import { useState, useEffect, useCallback } from 'react';
import { type Reservation } from '../domain/Reservation';
import { reservationService } from '../services/ReservationService';
import { dataChangeService } from '../services/DataChangeService';

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
  // Changes from this tab's actions and from other tabs reload the reservation by themselves.
  useEffect(() => dataChangeService.subscribe(['reservations'], () => { refresh(); }), [refresh]);

  const checkIn = useCallback(async () => {
    if (!id) return;
    await reservationService.checkIn(id);
  }, [id]);

  const checkOut = useCallback(async () => {
    if (!id) return;
    await reservationService.checkOut(id);
  }, [id]);

  const cancel = useCallback(async () => {
    if (!id) return;
    await reservationService.cancel(id);
  }, [id]);

  return { reservation, loading, error, refresh, checkIn, checkOut, cancel };
}
