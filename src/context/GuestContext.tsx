import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Guest } from '../domain/Guest';
import { guestService } from '../services/GuestService';

interface GuestContextValue {
  guests: Guest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await guestService.getGuests();
      setGuests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <GuestContext.Provider value={{ guests, loading, error, refresh }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuestContext() {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuestContext must be used within GuestProvider');
  return context;
}
