import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Reservation } from '../domain/Reservation';
import { reservationService } from '../services/ReservationService';

interface ReservationContextValue {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reservationService.getAllReservations();
      setReservations(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <ReservationContext.Provider value={{ reservations, loading, error, refresh }}>
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservationContext() {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservationContext must be used within ReservationProvider');
  return context;
}
